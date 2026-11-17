// @vitest-environment node
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { getGlobalDispatcher, setGlobalDispatcher } from "undici";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  EgressBlockedError,
  createGuardedLookup,
  installEgressGuard,
  isBlockedAddress,
  isBlockedHostname,
  isEgressGuardEnabled,
} from "./egressGuard";

describe("isBlockedAddress", () => {
  it.each([
    "0.0.0.0",
    "10.1.2.3",
    "100.64.7.179",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.10",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "ff02::1",
    "::ffff:10.0.0.1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "0:0:0:0:0:ffff:a00:1",
    "[::1]",
    "fe80::1%eth0",
    "64:ff9b::a00:1",
  ])("blocks non-public address %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "151.101.1.69", "198.252.206.2", "2606:4700::6810:84e5", "::ffff:8.8.8.8"])(
    "allows public address %s",
    (address) => {
      expect(isBlockedAddress(address)).toBe(false);
    },
  );

  it("treats unparseable input as blocked", () => {
    expect(isBlockedAddress("not-an-ip")).toBe(true);
  });
});

describe("isBlockedHostname", () => {
  it.each([
    "localhost",
    "api.localhost",
    "kubernetes.default.svc",
    "kubernetes.default.svc.cluster.local",
    "printer.local",
    "metadata.google.internal",
    "sip-connector-control-plane.dev.int.stackoverflow.net",
    "SIP.DEV.INT.STACKOVERFLOW.NET.",
  ])("blocks internal hostname %s", (hostname) => {
    expect(isBlockedHostname(hostname)).toBe(true);
  });

  it.each(["acme.stackenterprise.co", "api.stackoverflowteams.com", "qa.customer-domain.com", "intranet-like.example.org"])(
    "allows public hostname %s",
    (hostname) => {
      expect(isBlockedHostname(hostname)).toBe(false);
    },
  );

  it("honours extra deny suffixes", () => {
    expect(isBlockedHostname("svc.corp.example", [".corp.example"])).toBe(true);
    expect(isBlockedHostname("corp.example", [".corp.example"])).toBe(true);
    expect(isBlockedHostname("notcorp.example", [".corp.example"])).toBe(false);
  });
});

describe("createGuardedLookup", () => {
  type Answer = { address: string; family: number };
  const fakeLookup = (answers: Answer[]) =>
    ((_hostname: string, _options: unknown, callback: (...args: unknown[]) => void) => {
      callback(null, answers);
    }) as unknown as Parameters<typeof createGuardedLookup>[0];

  const run = (lookup: ReturnType<typeof createGuardedLookup>, hostname: string, all = true) =>
    new Promise<{ error: NodeJS.ErrnoException | null; result: unknown }>((resolve) => {
      lookup(hostname, { all }, (error: NodeJS.ErrnoException | null, address: unknown, family?: number) => {
        resolve({ error, result: all ? address : { address, family } });
      });
    });

  it("passes through public answers in the requested shape", async () => {
    const lookup = createGuardedLookup(fakeLookup([{ address: "198.252.206.2", family: 4 }]));
    await expect(run(lookup, "acme.stackenterprise.co")).resolves.toEqual({
      error: null,
      result: [{ address: "198.252.206.2", family: 4 }],
    });
    await expect(run(lookup, "acme.stackenterprise.co", false)).resolves.toEqual({
      error: null,
      result: { address: "198.252.206.2", family: 4 },
    });
  });

  it("rejects a hostname when any resolved address is private (rebinding-safe)", async () => {
    const lookup = createGuardedLookup(
      fakeLookup([
        { address: "198.252.206.2", family: 4 },
        { address: "10.0.0.5", family: 4 },
      ]),
    );
    const { error } = await run(lookup, "rebind.attacker.example");
    expect(error).toBeInstanceOf(EgressBlockedError);
    expect(error?.code).toBe("EGRESS_BLOCKED");
  });

  it("rejects internal hostnames without resolving them", async () => {
    let called = false;
    const lookup = createGuardedLookup(((..._args: unknown[]) => {
      called = true;
    }) as unknown as Parameters<typeof createGuardedLookup>[0]);
    const { error } = await run(lookup, "kubernetes.default.svc.cluster.local");
    expect(error).toBeInstanceOf(EgressBlockedError);
    expect(called).toBe(false);
  });
});

describe("isEgressGuardEnabled", () => {
  it("is on by default and only disabled by an explicit opt-out", () => {
    expect(isEgressGuardEnabled({})).toBe(true);
    expect(isEgressGuardEnabled({ STACK_API_UTILITIES_ALLOW_PRIVATE_EGRESS: "false" })).toBe(true);
    expect(isEgressGuardEnabled({ STACK_API_UTILITIES_ALLOW_PRIVATE_EGRESS: "true" })).toBe(false);
  });
});

describe("installEgressGuard with the built-in fetch", () => {
  let server: Server;
  let port: number;
  const originalDispatcher = getGlobalDispatcher();

  beforeAll(async () => {
    server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"reached":true}');
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(() => {
    setGlobalDispatcher(originalDispatcher);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("is reachable without the guard (control)", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    await expect(response.json()).resolves.toEqual({ reached: true });
  });

  it("blocks IP-literal and DNS targets that land on a private address", async () => {
    expect(installEgressGuard({})).toBe(true);

    for (const url of [`http://127.0.0.1:${port}/`, `http://localhost:${port}/`, `http://[::ffff:127.0.0.1]:${port}/`]) {
      const failure = await fetch(url).then(
        () => null,
        (error: Error & { cause?: { code?: string } }) => error,
      );
      expect(failure, url).toBeInstanceOf(TypeError);
      expect(failure?.cause?.code, url).toBe("EGRESS_BLOCKED");
    }
  });

  it("does nothing when explicitly opted out", async () => {
    expect(installEgressGuard({ STACK_API_UTILITIES_ALLOW_PRIVATE_EGRESS: "true" })).toBe(false);
    const response = await fetch(`http://127.0.0.1:${port}/`);
    expect(response.status).toBe(200);
  });
});
