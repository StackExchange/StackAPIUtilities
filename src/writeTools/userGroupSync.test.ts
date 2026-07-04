import { describe, expect, it } from "vitest";
import {
  parseUserExportCsv,
  planUserGroupSync,
  renderGroupName,
  type ExistingUserGroup,
  type ResolvedStackUser,
} from "./userGroupSync";

const csv = [
  "Director,Senior Manager,User Group Member,First Name,Last Name,Colleague ID,Email,Job Title",
  "Pat Director,Ada Lovelace,Grace Hopper,Grace,Hopper,1001,grace@example.com,Engineer",
  "Pat Director,Ada Lovelace,Linus Torvalds,Linus,Torvalds,1002,linus@example.com,Engineer",
  "Pat Director,Alan Turing,Katherine Johnson,Katherine,Johnson,1003,katherine@example.com,Analyst",
].join("\n");

describe("parseUserExportCsv", () => {
  it("accepts the expected user export headers and normalizes rows", () => {
    expect(parseUserExportCsv(csv)).toEqual([
      expect.objectContaining({
        rowNumber: 2,
        seniorManager: "Ada Lovelace",
        email: "grace@example.com",
      }),
      expect.objectContaining({
        rowNumber: 3,
        seniorManager: "Ada Lovelace",
        email: "linus@example.com",
      }),
      expect.objectContaining({
        rowNumber: 4,
        seniorManager: "Alan Turing",
        email: "katherine@example.com",
      }),
    ]);
  });

  it("reports missing required columns", () => {
    expect(() => parseUserExportCsv("Senior Manager,Email\nAda Lovelace,ada@example.com")).toThrow(
      "User export CSV is missing required column(s): Director, User Group Member, First Name, Last Name, Colleague ID, Job Title",
    );
  });
});

describe("renderGroupName", () => {
  it("renders the configurable senior-manager template", () => {
    expect(renderGroupName("{Senior Manager} VRM", "Ada Lovelace")).toBe("Ada Lovelace VRM");
    expect(renderGroupName("VRM - {Senior Manager}", "Ada Lovelace")).toBe("VRM - Ada Lovelace");
  });
});

describe("planUserGroupSync", () => {
  const resolvedUsers: Record<string, ResolvedStackUser | null> = {
    "grace@example.com": { id: 1, email: "grace@example.com", name: "Grace Hopper" },
    "linus@example.com": { id: 2, email: "linus@example.com", name: "Linus Torvalds" },
    "katherine@example.com": { id: 3, email: "katherine@example.com", name: "Katherine Johnson" },
  };

  const existingGroups: ExistingUserGroup[] = [
    {
      id: 10,
      name: "Ada Lovelace VRM",
      users: [
        { id: 1, name: "Grace Hopper" },
        { id: 99, name: "Former Member" },
      ],
    },
  ];

  it("plans add-only creates and additions without removals", () => {
    const plan = planUserGroupSync({
      rows: parseUserExportCsv(csv),
      groupNameTemplate: "{Senior Manager} VRM",
      syncMode: "add-only",
      existingGroups,
      resolvedUsers,
    });

    expect(plan.blockingErrors).toEqual([]);
    expect(plan.groups).toEqual([
      expect.objectContaining({
        manager: "Ada Lovelace",
        groupName: "Ada Lovelace VRM",
        existingGroupId: 10,
        createGroup: false,
        desiredUserIds: [1, 2],
        addUserIds: [2],
        removeUserIds: [],
      }),
      expect.objectContaining({
        manager: "Alan Turing",
        groupName: "Alan Turing VRM",
        existingGroupId: null,
        createGroup: true,
        desiredUserIds: [3],
        addUserIds: [3],
        removeUserIds: [],
      }),
    ]);
  });

  it("plans exact-sync removals for matching generated groups", () => {
    const plan = planUserGroupSync({
      rows: parseUserExportCsv(csv),
      groupNameTemplate: "{Senior Manager} VRM",
      syncMode: "exact-sync",
      existingGroups,
      resolvedUsers,
    });

    expect(plan.groups[0]).toEqual(expect.objectContaining({ removeUserIds: [99] }));
  });

  it("records skipped rows for blank values, duplicates, and unresolved emails", () => {
    const rows = parseUserExportCsv(
      [
        "Director,Senior Manager,User Group Member,First Name,Last Name,Colleague ID,Email,Job Title",
        "Pat Director,,Grace Hopper,Grace,Hopper,1001,grace@example.com,Engineer",
        "Pat Director,Ada Lovelace,Missing Email,Missing,Email,1002,,Engineer",
        "Pat Director,Ada Lovelace,Grace Hopper,Grace,Hopper,1003,grace@example.com,Engineer",
        "Pat Director,Ada Lovelace,Unresolved User,Unresolved,User,1004,nope@example.com,Engineer",
      ].join("\n"),
    );

    const plan = planUserGroupSync({
      rows,
      groupNameTemplate: "{Senior Manager} VRM",
      syncMode: "add-only",
      existingGroups: [],
      resolvedUsers: {
        "grace@example.com": { id: 1, email: "grace@example.com", name: "Grace Hopper" },
        "nope@example.com": null,
      },
    });

    expect(plan.skippedRows.map((row) => row.reason)).toEqual([
      "Missing Senior Manager",
      "Missing Email",
      "Duplicate Email",
      "Email not found in Stack Enterprise",
    ]);
  });

  it("blocks apply when distinct managers render to the same group name", () => {
    const plan = planUserGroupSync({
      rows: parseUserExportCsv(csv),
      groupNameTemplate: "VRM",
      syncMode: "add-only",
      existingGroups: [],
      resolvedUsers,
    });

    expect(plan.blockingErrors).toEqual([
      'Group name "VRM" is produced by multiple Senior Manager values: Ada Lovelace, Alan Turing.',
    ]);
  });
});
