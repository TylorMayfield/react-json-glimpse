import {
  type CSSProperties,
  type KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  flattenJson,
  getEntries,
  getChildCount,
  getJsonType,
  isExpandable,
  makeArrayChildId,
  makeObjectChildId,
  type FlattenedJsonNode,
  type JsonPath,
  type JsonValue
} from "./tree";

export type { JsonPath, JsonValue } from "./tree";

export interface JsonGlimpseTheme {
  readonly background: string;
  readonly border: string;
  readonly boolean: string;
  readonly bracket: string;
  readonly caret: string;
  readonly hoverBackground: string;
  readonly key: string;
  readonly muted: string;
  readonly null: string;
  readonly number: string;
  readonly string: string;
  readonly text: string;
}

export interface SelectionPayload {
  readonly path: JsonPath;
  readonly value: JsonValue;
}

export interface JsonGlimpseProps {
  readonly value: JsonValue;
  readonly className?: string;
  readonly collapsed?: boolean;
  readonly height?: number | string;
  readonly initialExpandedDepth?: number;
  readonly onSelect?: (payload: SelectionPayload) => void;
  readonly overscan?: number;
  readonly rootName?: string;
  readonly rowHeight?: number;
  readonly style?: CSSProperties;
  readonly theme?: Partial<JsonGlimpseTheme>;
}

export const defaultTheme: JsonGlimpseTheme = {
  background: "#ffffff",
  border: "#d8dee4",
  boolean: "#9a3412",
  bracket: "#57606a",
  caret: "#57606a",
  hoverBackground: "#f6f8fa",
  key: "#0550ae",
  muted: "#6e7781",
  null: "#8250df",
  number: "#116329",
  string: "#953800",
  text: "#24292f"
};

const DEFAULT_HEIGHT = 420;
const DEFAULT_ROW_HEIGHT = 24;
const DEFAULT_OVERSCAN = 8;

export function ReactJsonGlimpse(props: JsonGlimpseProps) {
  return <JsonGlimpse {...props} />;
}

export function JsonGlimpse({
  value,
  className,
  collapsed = false,
  height = DEFAULT_HEIGHT,
  initialExpandedDepth = 1,
  onSelect,
  overscan = DEFAULT_OVERSCAN,
  rootName = "root",
  rowHeight = DEFAULT_ROW_HEIGHT,
  style,
  theme
}: JsonGlimpseProps) {
  const mergedTheme = useMemo(() => ({ ...defaultTheme, ...theme }), [theme]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (collapsed) {
      return new Set();
    }

    return createInitialExpandedIds(value, rootName, initialExpandedDepth);
  });
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeight, setMeasuredHeight] = useState(
    typeof height === "number" ? height : DEFAULT_HEIGHT
  );
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setExpandedIds(collapsed ? new Set() : createInitialExpandedIds(value, rootName, initialExpandedDepth));
    setScrollTop(0);
  }, [collapsed, initialExpandedDepth, rootName, value]);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setMeasuredHeight(entry.contentRect.height);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const rows = useMemo(
    () => flattenJson(value, { expandedIds, rootName }),
    [expandedIds, rootName, value]
  );

  const visibleCount = Math.max(1, Math.ceil(measuredHeight / rowHeight));
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(rows.length, startIndex + visibleCount + overscan * 2);
  const totalHeight = rows.length * rowHeight;
  const visibleRows = rows.slice(startIndex, endIndex);

  const toggle = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const rootStyle = {
    "--rjg-bg": mergedTheme.background,
    "--rjg-border": mergedTheme.border,
    "--rjg-boolean": mergedTheme.boolean,
    "--rjg-bracket": mergedTheme.bracket,
    "--rjg-caret": mergedTheme.caret,
    "--rjg-hover-bg": mergedTheme.hoverBackground,
    "--rjg-key": mergedTheme.key,
    "--rjg-muted": mergedTheme.muted,
    "--rjg-null": mergedTheme.null,
    "--rjg-number": mergedTheme.number,
    "--rjg-string": mergedTheme.string,
    "--rjg-text": mergedTheme.text,
    ...style
  } as CSSProperties;

  return (
    <div className={className} style={rootStyle}>
      <style>{componentCss}</style>
      <div
        ref={scrollerRef}
        className="rjg"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        role="tree"
        style={{ height }}
      >
        <div className="rjg-spacer" style={{ height: totalHeight }}>
          <div
            className="rjg-window"
            style={{ transform: `translateY(${startIndex * rowHeight}px)` }}
          >
            {visibleRows.map((row) => (
              <JsonRow
                key={row.id}
                expanded={expandedIds.has(row.id)}
                node={row}
                onSelect={onSelect}
                onToggle={toggle}
                rootName={rootName}
                rowHeight={rowHeight}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface JsonRowProps {
  readonly expanded: boolean;
  readonly node: FlattenedJsonNode;
  readonly onSelect?: (payload: SelectionPayload) => void;
  readonly onToggle: (id: string) => void;
  readonly rootName: string;
  readonly rowHeight: number;
}

const JsonRow = memo(function JsonRow({
  expanded,
  node,
  onSelect,
  onToggle,
  rootName,
  rowHeight
}: JsonRowProps) {
  const hasChildren = node.expandable;
  const summary = hasChildren ? getCollectionSummary(node.value, expanded) : null;

  const handleToggle = useCallback(() => {
    if (hasChildren) {
      onToggle(node.id);
    }
  }, [hasChildren, node.id, onToggle]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  return (
    <div
      className="rjg-row"
      onClick={() => onSelect?.({ path: node.path, value: node.value })}
      role="treeitem"
      style={{ height: rowHeight, paddingLeft: 8 + node.depth * 16 }}
      tabIndex={0}
    >
      <span
        aria-expanded={hasChildren ? expanded : undefined}
        aria-hidden={!hasChildren}
        className="rjg-caret"
        onClick={(event) => {
          event.stopPropagation();
          handleToggle();
        }}
        onKeyDown={handleKeyDown}
        role={hasChildren ? "button" : undefined}
        tabIndex={hasChildren ? 0 : -1}
      >
        {hasChildren ? (expanded ? "-" : "+") : ""}
      </span>
      {node.keyName !== undefined ? <KeyLabel name={node.keyName} /> : <span className="rjg-root">{rootName}</span>}
      {node.keyName !== undefined ? <span className="rjg-colon">: </span> : null}
      {hasChildren ? (
        <span className="rjg-summary">{summary}</span>
      ) : (
        <ValueLabel value={node.value} />
      )}
    </div>
  );
});

function KeyLabel({ name }: { readonly name: string | number }) {
  if (typeof name === "number") {
    return <span className="rjg-index">{name}</span>;
  }

  return <span className="rjg-key">"{name}"</span>;
}

function ValueLabel({ value }: { readonly value: JsonValue }) {
  if (typeof value === "string") {
    return <span className="rjg-string">{JSON.stringify(value)}</span>;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return <span className="rjg-number">{String(value)}</span>;
  }

  if (typeof value === "boolean") {
    return <span className="rjg-boolean">{String(value)}</span>;
  }

  const type = getJsonType(value);

  switch (type) {
    case "date":
      return <span className="rjg-string">{JSON.stringify((value as Date).toISOString())}</span>;
    case "function":
      return <span className="rjg-muted">[Function {getFunctionName(value)}]</span>;
    case "nan":
      return <span className="rjg-number">NaN</span>;
    case "symbol":
      return <span className="rjg-muted">{String(value)}</span>;
    case "undefined":
      return <span className="rjg-null">undefined</span>;
    default:
      return <span className="rjg-null">null</span>;
  }
}

function getCollectionSummary(value: JsonValue, expanded: boolean): string {
  const count = getChildCount(value);
  const type = getJsonType(value);

  if (expanded) {
    if (type === "array") {
      return `Array(${count}) [`;
    }

    if (type === "map") {
      return `Map(${count}) {`;
    }

    if (type === "set") {
      return `Set(${count}) {`;
    }

    return `Object(${count}) {`;
  }

  if (type === "array") {
    return `Array(${count}) [...]`;
  }

  if (type === "map") {
    return `Map(${count}) {...}`;
  }

  if (type === "set") {
    return `Set(${count}) {...}`;
  }

  return `Object(${count}) {...}`;
}

function createInitialExpandedIds(
  value: JsonValue,
  rootName: string,
  maxDepth: number
): Set<string> {
  const expandedIds = new Set<string>();
  const ancestors = typeof WeakSet === "undefined" ? undefined : new WeakSet<object>();

  visit(value, rootName, 0);

  function visit(current: JsonValue, id: string, depth: number): void {
    if (
      !isExpandable(current) ||
      depth >= maxDepth ||
      (ancestors && current !== null && typeof current === "object" && ancestors.has(current))
    ) {
      return;
    }

    expandedIds.add(id);

    if (ancestors && current !== null && typeof current === "object") {
      ancestors.add(current);
    }

    getEntries(current).forEach(([key, child]) => {
      const childId = typeof key === "number" ? makeArrayChildId(id, key) : makeObjectChildId(id, String(key));
      visit(child, childId, depth + 1);
    });

    if (ancestors && current !== null && typeof current === "object") {
      ancestors.delete(current);
    }
  }

  return expandedIds;
}

function getFunctionName(value: JsonValue): string {
  return typeof value === "function" && value.name ? value.name : "anonymous";
}

const componentCss = `
.rjg {
  background: var(--rjg-bg);
  border: 1px solid var(--rjg-border);
  border-radius: 8px;
  color: var(--rjg-text);
  font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  overflow: auto;
  position: relative;
}
.rjg-spacer {
  min-width: 100%;
  position: relative;
}
.rjg-window {
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
}
.rjg-row {
  align-items: center;
  box-sizing: border-box;
  cursor: default;
  display: flex;
  outline: none;
  padding-right: 8px;
  white-space: nowrap;
}
.rjg-row:hover,
.rjg-row:focus {
  background: var(--rjg-hover-bg);
}
.rjg-caret {
  color: var(--rjg-caret);
  cursor: pointer;
  display: inline-flex;
  flex: 0 0 16px;
  justify-content: center;
  margin-right: 2px;
  user-select: none;
}
.rjg-root,
.rjg-index,
.rjg-summary,
.rjg-colon {
  color: var(--rjg-muted);
}
.rjg-key {
  color: var(--rjg-key);
}
.rjg-string {
  color: var(--rjg-string);
}
.rjg-number {
  color: var(--rjg-number);
}
.rjg-boolean {
  color: var(--rjg-boolean);
}
.rjg-null {
  color: var(--rjg-null);
}
`;
