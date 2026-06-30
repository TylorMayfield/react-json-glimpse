# react-json-glimpse

A small, virtualized JSON viewer for React apps that need the useful parts of `react-json-view` without the old dependency weight.

## Goals

- TypeScript-first API
- Virtualized rows for large payloads
- Lazy expand/collapse so collapsed branches are not walked into the row model
- Zero-dependency styling with CSS variables and inline component CSS
- SSR-safe rendering with browser-only measurement in effects
- React 18/19 compatible peer dependencies

## Install

```bash
pnpm add react-json-glimpse
```

## Use

```tsx
import { JsonGlimpse } from "react-json-glimpse";

export function PayloadPreview({ payload }: { payload: unknown }) {
  return (
    <JsonGlimpse
      value={payload}
      height={520}
      initialExpandedDepth={2}
      onSelect={({ path, value }) => {
        console.log(path, value);
      }}
    />
  );
}
```

## API

| Prop | Type | Default |
| --- | --- | --- |
| `value` | `JsonValue` | Required |
| `height` | `number | string` | `420` |
| `rowHeight` | `number` | `24` |
| `overscan` | `number` | `8` |
| `initialExpandedDepth` | `number` | `1` |
| `collapsed` | `boolean` | `false` |
| `rootName` | `string` | `"root"` |
| `theme` | `Partial<JsonGlimpseTheme>` | GitHub-light inspired |
| `onSelect` | `({ path, value }) => void` | `undefined` |

## Comparison

Measured on June 30, 2026:

| Package | Published version checked | Runtime deps | Peer React range | Packed size | Unpacked size |
| --- | ---: | ---: | --- | ---: | ---: |
| `react-json-glimpse` | `0.1.0` | `0` | `>=18.2.0 || >=19.0.0` | `~13 KB` | `~99 KB` |
| `react-json-view` | `1.21.3` | `4` | React `15`-`17` | `~40 KB` | `~140 KB` |
| `@uiw/react-json-view` | `2.0.0-alpha.43` | `0` | React `>=18` | `~52 KB` | `~364 KB` |

`react-json-glimpse` focuses on the high-volume read-only viewer path: render only visible rows, walk only expanded branches, and keep styling dependency-free. It does not yet aim to replace editing, clipboard helpers, icon packs, or theme catalogs from heavier viewers.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```
