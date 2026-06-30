import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { JsonGlimpse, type JsonPath } from "../src";
import "./styles.css";

const circularAccount: Record<string, unknown> = {
  id: "acct_live_42",
  tier: "enterprise",
  active: true
};
circularAccount.self = circularAccount;

const demoPayload = {
  requestId: "req_9f8b74e2",
  generatedAt: new Date("2026-06-30T19:25:00.000Z"),
  environment: "production",
  latencyMs: 38.6,
  retryable: false,
  account: circularAccount,
  featureFlags: new Map([
    ["virtualizedRows", true],
    ["lazyExpansion", true],
    ["editableValues", false]
  ]),
  users: Array.from({ length: 650 }, (_, index) => ({
    id: `user_${String(index + 1).padStart(4, "0")}`,
    name: `Demo User ${index + 1}`,
    role: index % 9 === 0 ? "admin" : "member",
    score: Number((Math.sin(index / 8) * 42 + 58).toFixed(2)),
    tags: index % 5 === 0 ? ["beta", "high-volume"] : ["standard"],
    metadata: {
      lastSeen: new Date(Date.UTC(2026, 5, 30, 12, index % 60, 0)),
      region: ["iad", "sfo", "fra", "sin"][index % 4],
      quota: index % 17 === 0 ? undefined : 1000 + index
    }
  })),
  totals: {
    rows: 650,
    visibleDomRows: "viewport only",
    circularRefs: 1,
    bundle: {
      esm: "13.54 KB",
      esmGzip: "3.8 KB"
    }
  },
  specialValues: {
    missing: undefined,
    notANumber: Number.NaN,
    exactCount: 9007199254740993n,
    token: Symbol("demo"),
    formatter: function formatJsonPreview() {
      return "preview";
    },
    uniqueRegions: new Set(["iad", "sfo", "fra", "sin"])
  }
};

function App() {
  const [selectedPath, setSelectedPath] = useState<JsonPath>([]);
  const pathLabel = useMemo(() => {
    if (selectedPath.length === 0) {
      return "root";
    }

    return selectedPath.map((segment) => (typeof segment === "number" ? `[${segment}]` : `.${segment}`)).join("");
  }, [selectedPath]);

  return (
    <main className="demo-shell">
      <section className="demo-copy" aria-labelledby="demo-title">
        <p className="demo-kicker">react-json-glimpse</p>
        <h1 id="demo-title">Virtualized JSON inspection without the old dev-tool weight.</h1>
        <p className="demo-lede">
          A dependency-free viewer for modern React apps, tuned for large payloads, lazy expansion, and SSR-safe rendering.
        </p>
        <dl className="demo-stats" aria-label="Package stats">
          <div>
            <dt>ESM gzip</dt>
            <dd>3.8 KB</dd>
          </div>
          <div>
            <dt>Runtime deps</dt>
            <dd>0</dd>
          </div>
          <div>
            <dt>Rows</dt>
            <dd>650+</dd>
          </div>
        </dl>
      </section>

      <section className="viewer-panel" aria-label="JSON viewer demo">
        <header className="viewer-header">
          <div>
            <span className="status-dot" />
            <span>production payload</span>
          </div>
          <span className="selected-path">{pathLabel}</span>
        </header>
        <JsonGlimpse
          value={demoPayload}
          height={560}
          initialExpandedDepth={2}
          onSelect={({ path }) => setSelectedPath(path)}
          rootName="response"
          theme={{
            background: "#fbfcfe",
            border: "#cfd7e3",
            hoverBackground: "#edf3fb"
          }}
        />
      </section>
    </main>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
