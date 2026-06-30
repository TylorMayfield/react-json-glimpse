export type JsonPrimitive = string | number | boolean | bigint | symbol | null | undefined;
export type JsonObject = { readonly [key: string]: unknown };
export type JsonArray = readonly unknown[];
export type JsonValue = unknown;
export type JsonPath = readonly (string | number)[];

export interface FlattenedJsonNode {
  readonly id: string;
  readonly depth: number;
  readonly keyName: string | number | undefined;
  readonly path: JsonPath;
  readonly value: JsonValue;
  readonly type: JsonNodeType;
  readonly expandable: boolean;
  readonly childCount: number;
  readonly circular: boolean;
}

export type JsonNodeType =
  | "array"
  | "bigint"
  | "boolean"
  | "circular"
  | "date"
  | "function"
  | "map"
  | "nan"
  | "null"
  | "number"
  | "object"
  | "set"
  | "string"
  | "symbol"
  | "undefined";

export interface FlattenJsonOptions {
  readonly expandedIds: ReadonlySet<string>;
  readonly rootName?: string;
}

export function flattenJson(
  value: JsonValue,
  { expandedIds, rootName = "root" }: FlattenJsonOptions
): FlattenedJsonNode[] {
  const rows: FlattenedJsonNode[] = [];
  const seen = typeof WeakSet === "undefined" ? undefined : new WeakSet<object>();

  visit(value, [], undefined, 0, rootName, seen);

  function visit(
    current: JsonValue,
    path: JsonPath,
    keyName: string | number | undefined,
    depth: number,
    id: string,
    ancestors: WeakSet<object> | undefined
  ): void {
    const circular = isCircularReference(current, ancestors);
    const expandable = !circular && isExpandable(current);
    rows.push({
      id,
      depth,
      keyName,
      path,
      value: current,
      type: circular ? "circular" : getJsonType(current),
      expandable,
      childCount: circular ? 0 : getChildCount(current),
      circular
    });

    if (!expandable || !expandedIds.has(id)) {
      return;
    }

    if (ancestors && current !== null && typeof current === "object") {
      ancestors.add(current);
    }

    if (Array.isArray(current)) {
      current.forEach((child, index) => {
        visit(child, [...path, index], index, depth + 1, makeArrayChildId(id, index), ancestors);
      });
      ancestors?.delete(current);
      return;
    }

    getEntries(current).forEach(([key, child]) => {
      const childId = typeof key === "number" ? makeArrayChildId(id, key) : makeObjectChildId(id, String(key));
      visit(child, [...path, key], key, depth + 1, childId, ancestors);
    });
    ancestors?.delete(current);
  }

  return rows;
}

export function isExpandable(value: JsonValue): value is JsonArray | JsonObject | Map<unknown, unknown> | Set<unknown> {
  if (value === null || typeof value !== "object" || value instanceof Date) {
    return false;
  }

  return getChildCount(value) > 0;
}

export function getChildCount(value: JsonValue): number {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (value instanceof Map || value instanceof Set) {
    return value.size;
  }

  if (value !== null && typeof value === "object") {
    return Object.keys(value).length;
  }

  return 0;
}

export function getJsonType(value: JsonValue): JsonNodeType {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "number" && Number.isNaN(value)) {
    return "nan";
  }

  if (typeof value === "bigint") {
    return "bigint";
  }

  if (typeof value === "symbol") {
    return "symbol";
  }

  if (typeof value === "function") {
    return "function";
  }

  if (value instanceof Date) {
    return "date";
  }

  if (value instanceof Map) {
    return "map";
  }

  if (value instanceof Set) {
    return "set";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value as JsonNodeType;
}

export function makeArrayChildId(parentId: string, index: number): string {
  return `${parentId}[${index}]`;
}

export function makeObjectChildId(parentId: string, key: string): string {
  return `${parentId}.${escapePathKey(key)}`;
}

function escapePathKey(key: string): string {
  return key.replaceAll("\\", "\\\\").replaceAll(".", "\\.");
}

export function getEntries(value: JsonValue): [string | number, JsonValue][] {
  if (Array.isArray(value)) {
    return value.map((child, index) => [index, child as JsonValue]);
  }

  if (value instanceof Map) {
    return Array.from(value.entries()).map(([key, child]) => [String(key), child as JsonValue]);
  }

  if (value instanceof Set) {
    return Array.from(value.values()).map((child, index) => [index, child as JsonValue]);
  }

  const objectValue = value as JsonObject;
  return Object.keys(objectValue).map((key) => [key, objectValue[key] as JsonValue]);
}

function isCircularReference(
  value: JsonValue,
  ancestors: WeakSet<object> | undefined
): value is JsonObject | JsonArray {
  return Boolean(
    ancestors &&
      value !== null &&
      typeof value === "object" &&
      ancestors.has(value)
  );
}
