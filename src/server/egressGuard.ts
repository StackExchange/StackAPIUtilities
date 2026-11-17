import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from "node:dns";
import { BlockList, isIP, type Socket } from "node:net";
import { Agent, buildConnector, setGlobalDispatcher } from "undici";

/**
 * Outbound request guard for the server runtime.
 *
 * The API routes call whatever Stack site URL a user enters, server-side.
 * On a publicly reachable deployment that would let anyone use the server to
 * reach hosts that are only routable from where it runs (cluster services,
 * cloud metadata, internal DNS names). This guard is installed as undici's
 * global dispatcher, so every server-side `fetch` is covered, and refuses any
 * connection whose hostname or resolved address is not on the public internet.
 *
 * Checks happen at three points so DNS rebinding cannot slip through:
 *   1. hostname (internal suffixes, single-label names) before resolving,
 *   2. every resolved address (one private answer blocks the whole lookup),
 *   3. IP-literal targets and the socket's actual remote address.
 *
 * Self-hosters whose Stack site lives on a private network can opt out with
 * STACK_API_UTILITIES_ALLOW_PRIVATE_EGRESS=true.
 */

export class EgressBlockedError extends Error {
  readonly code = "EGRESS_BLOCKED";

  constructor(target: string) {
    super(`Outbound request to ${target} was blocked: it is not a public internet address.`);
    this.name = "EgressBlockedError";
  }
}

type Env = Record<string, string | undefined>;

const DEFAULT_DENIED_SUFFIXES = [
  "localhost",
  ".localhost",
  ".local",
  ".internal",
  ".svc",
  ".int.stackoverflow.net",
];

const blockedRanges = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT (also used for internal service IPs)
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay anycast
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
] as const) {
  blockedRanges.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128], // unspecified
  ["::1", 128], // loopback
  ["64:ff9b::", 96], // NAT64 (embeds IPv4)
  ["64:ff9b:1::", 48], // local-use NAT64
  ["100::", 64], // discard
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4 (embeds IPv4)
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["ff00::", 8], // multicast
] as const) {
  blockedRanges.addSubnet(network, prefix, "ipv6");
}

export function isBlockedAddress(address: string): boolean {
  const unbracketed = address.replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  const family = isIP(unbracketed);
  if (family === 4) return blockedRanges.check(unbracketed, "ipv4");
  if (family !== 6) return true;

  const mapped = ipv4FromMappedIpv6(unbracketed);
  if (mapped !== null) return blockedRanges.check(mapped, "ipv4");
  return blockedRanges.check(unbracketed, "ipv6");
}

export function isBlockedHostname(hostname: string, extraDeniedSuffixes: readonly string[] = []): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (host === "") return true;
  if (isIP(host)) return isBlockedAddress(host);
  // Single-label names are expanded through resolver search domains
  // (e.g. "kubernetes" -> kubernetes.default.svc.cluster.local).
  if (!host.includes(".")) return true;

  return [...DEFAULT_DENIED_SUFFIXES, ...extraDeniedSuffixes].some((rawSuffix) => {
    const suffix = rawSuffix.trim().toLowerCase().replace(/\.$/, "");
    if (suffix === "") return false;
    const bare = suffix.replace(/^\./, "");
    return host === bare || host.endsWith(`.${bare}`);
  });
}

export function isEgressGuardEnabled(env: Env = process.env): boolean {
  return env.STACK_API_UTILITIES_ALLOW_PRIVATE_EGRESS?.trim().toLowerCase() !== "true";
}

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;
type LookupFunction = (hostname: string, options: LookupOptions, callback: LookupCallback) => void;

/** Wraps dns.lookup so a hostname is refused if it, or any address it resolves to, is not public. */
export function createGuardedLookup(
  baseLookup: LookupFunction = dnsLookup as unknown as LookupFunction,
  extraDeniedSuffixes: readonly string[] = [],
): LookupFunction {
  return (hostname, rawOptions, rawCallback) => {
    const callback = (typeof rawOptions === "function" ? rawOptions : rawCallback) as LookupCallback;
    const options: LookupOptions =
      typeof rawOptions === "function" ? {} : typeof rawOptions === "number" ? { family: rawOptions } : (rawOptions ?? {});

    if (isBlockedHostname(hostname, extraDeniedSuffixes)) {
      process.nextTick(() => callback(blocked(hostname), options.all ? [] : ""));
      return;
    }

    baseLookup(hostname, { ...options, all: true }, (error, addresses) => {
      if (error) {
        callback(error, options.all ? [] : "");
        return;
      }
      const answers = Array.isArray(addresses) ? addresses : [{ address: addresses, family: isIP(addresses) }];
      if (answers.length === 0 || answers.some((answer) => isBlockedAddress(answer.address))) {
        callback(blocked(hostname), options.all ? [] : "");
        return;
      }
      if (options.all) {
        callback(null, answers);
      } else {
        callback(null, answers[0].address, answers[0].family);
      }
    });
  };
}

type Connector = ReturnType<typeof buildConnector>;

function createGuardedConnector(extraDeniedSuffixes: readonly string[]): Connector {
  const connect = buildConnector({ lookup: createGuardedLookup(undefined, extraDeniedSuffixes) } as buildConnector.BuildOptions);

  return (options, callback) => {
    const hostname = options.hostname.replace(/^\[|\]$/g, "");
    if (isBlockedHostname(hostname, extraDeniedSuffixes)) {
      callback(blocked(hostname), null);
      return;
    }

    connect(options, (error, socket) => {
      if (error || !socket) {
        callback(error ?? new Error("Connection failed"), null);
        return;
      }
      const remoteAddress = (socket as Socket).remoteAddress;
      if (remoteAddress !== undefined && isBlockedAddress(remoteAddress)) {
        socket.destroy();
        callback(blocked(hostname), null);
        return;
      }
      callback(null, socket);
    });
  };
}

/** Installs the guard for every server-side fetch. Returns whether it was installed. */
export function installEgressGuard(env: Env = process.env): boolean {
  if (!isEgressGuardEnabled(env)) return false;
  const extraDeniedSuffixes = (env.STACK_API_UTILITIES_EGRESS_DENY_SUFFIXES ?? "")
    .split(",")
    .map((suffix) => suffix.trim())
    .filter(Boolean);
  setGlobalDispatcher(new Agent({ connect: createGuardedConnector(extraDeniedSuffixes) }));
  return true;
}

function blocked(target: string): EgressBlockedError {
  const error = new EgressBlockedError(target);
  // Hostname only: never log paths, query strings or credentials.
  console.warn(`[egress-guard] blocked outbound request to ${target}`);
  return error;
}

/** IPv4-mapped IPv6 (::ffff:a.b.c.d or ::ffff:hhhh:hhhh, also written 0:0:0:0:0:ffff:...) -> a.b.c.d */
function ipv4FromMappedIpv6(address: string): string | null {
  const lower = address.toLowerCase().replace(/^(?:0{1,4}:){5}ffff:/, "::ffff:");
  const dotted = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) return dotted[1];

  const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const high = Number.parseInt(hex[1], 16);
    const low = Number.parseInt(hex[2], 16);
    return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
  }
  return null;
}
