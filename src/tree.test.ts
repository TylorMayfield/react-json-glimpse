import { describe, expect, it } from "vitest";
import { flattenJson } from "./tree";

describe("flattenJson", () => {
  it("keeps collapsed children out of the row model", () => {
    const rows = flattenJson(
      { a: { b: [1, 2, 3] }, c: true },
      { expandedIds: new Set(["root"]) }
    );

    expect(rows.map((row) => row.id)).toEqual(["root", "root.a", "root.c"]);
  });

  it("walks only expanded branches", () => {
    const rows = flattenJson(
      { a: { b: [1, 2] }, c: true },
      { expandedIds: new Set(["root", "root.a", "root.a.b"]) }
    );

    expect(rows.map((row) => row.id)).toEqual([
      "root",
      "root.a",
      "root.a.b",
      "root.a.b[0]",
      "root.a.b[1]",
      "root.c"
    ]);
  });

  it("marks circular references without recursing forever", () => {
    const value: Record<string, unknown> = { name: "loop" };
    value.self = value;

    const rows = flattenJson(value, {
      expandedIds: new Set(["root", "root.self"])
    });

    expect(rows.map((row) => [row.id, row.type, row.circular])).toEqual([
      ["root", "object", false],
      ["root.name", "string", false],
      ["root.self", "circular", true]
    ]);
  });

  it("supports dev-tool values beyond strict JSON", () => {
    const rows = flattenJson(
      {
        missing: undefined,
        count: 1n,
        createdAt: new Date("2026-06-30T12:00:00.000Z"),
        lookup: new Map([["ok", true]]),
        values: new Set(["a"])
      },
      { expandedIds: new Set(["root", "root.lookup", "root.values"]) }
    );

    expect(rows.map((row) => [row.id, row.type])).toEqual([
      ["root", "object"],
      ["root.missing", "undefined"],
      ["root.count", "bigint"],
      ["root.createdAt", "date"],
      ["root.lookup", "map"],
      ["root.lookup.ok", "boolean"],
      ["root.values", "set"],
      ["root.values[0]", "string"]
    ]);
  });
});
