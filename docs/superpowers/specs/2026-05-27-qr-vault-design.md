# QR Vault Static App Design

Date: 2026-05-27

## Goal

Create `apps/qr-vault`, a static local-first web app for collecting, editing, previewing, importing, exporting, and sharing mobile deep-link QR codes.

The app solves the current document-maintenance problem: developers can keep many scan-ready QR codes in local collections, share a single QR through a self-contained URL, and import or export the local vault as a file.

## Non-Goals

- No server persistence.
- No authentication.
- No database.
- No QR image persistence.
- No multi-user collaboration.
- No support for repeated query keys in the first version.

## Stack

- Vite + React + TypeScript.
- TanStack Router with `createHashHistory()` for static hosting without server rewrites.
- Code-based route tree, because the route count is small and generated route files are unnecessary for this app.
- localStorage as the only persistence layer.
- Unit tests for URL parsing, URL rebuilding, and storage import behavior.

## Routes

```txt
/#/
/#/collections
/#/collections/$collectionId
/#/q/$qrId
/#/share?url=...&title=...&description=...
/#/new?url=...
/#/import
```

Route roles:

- `/#/` is the local workspace for search, recent QR codes, collections, and quick add.
- `/#/collections` lists all collections.
- `/#/collections/$collectionId` shows QR codes related to one collection.
- `/#/q/$qrId` edits one saved local QR code.
- `/#/share` previews one self-contained QR code from search params and can save it into local storage.
- `/#/new` creates a new saved QR code, optionally prefilled from a `url` search param.
- `/#/import` handles import, export, merge, and replace actions.

## Data Model

localStorage stores one versioned JSON document:

```ts
type VaultData = {
  version: 1;
  qrs: QRCodeItem[];
  collections: Collection[];
  collectionItems: CollectionItem[];
};

type QRCodeItem = {
  id: string;
  title?: string;
  description?: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

type Collection = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

type CollectionItem = {
  collectionId: string;
  qrId: string;
};
```

Derived values are not persisted:

- scheme
- path
- query map
- rendered QR image
- generated share URL

One QR can belong to multiple collections through `collectionItems`.

## URL Parsing And Editing

The persisted source of truth for a QR is `QRCodeItem.url`.

The QR editor provides two synchronized editing modes:

- Full URL editor: editing the deeplink string updates the parsed scheme, path, and query preview.
- Structured editor: editing scheme, path, or query key-value rows rebuilds the full URL.

Validation rules:

- Intermediate invalid states are allowed while typing.
- Saving requires a non-empty scheme and path.
- Empty query keys are ignored when rebuilding a URL.
- Query uses normal key-value semantics; repeated keys collapse to the last value.
- Query encoding and decoding use standard URL APIs so Chinese text, JSON strings, and special characters survive round trips.

Example:

```txt
xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1&item_id=2
```

Parses as:

```txt
scheme: xhsdiscover
path: rn/wakanda/buyer-conversion
query:
  sku_id = 1
  item_id = 2
```

## Sharing

Single QR sharing is fully self-contained:

```txt
/#/share?url=<encodedDeepLink>&title=<optional>&description=<optional>
```

The share page does not depend on local storage. It renders:

- large QR code
- full deeplink URL
- parsed scheme, path, and query
- optional title
- optional description
- save-to-local action

Saving from the share page creates a local `QRCodeItem` and navigates to `/#/q/$qrId`.

## Import And Export

Export downloads the full `VaultData` JSON document.

Import has two modes:

- Merge, default: records with the same `id` overwrite local records; local-only records remain.
- Replace: clear local vault data first, then import. This is a dangerous action and must be visually separated from merge.

Import validates the top-level shape before applying data. Invalid files should leave local data unchanged.

## UI Structure

Desktop workspace:

- Left: collections navigation.
- Center: QR list, search, and quick add.
- Right: selected QR preview summary.

Single QR edit page:

- Large QR preview.
- Full URL editor.
- Parsed scheme, path, and query editor.
- Title and description fields.
- Collection membership controls.
- Share URL generation and copy action.

Share page:

- Focused single QR preview.
- Parsed URL details.
- Save-to-local action.

Mobile layout:

- Workspace collapses into simpler sections or tabs.
- QR preview and URL editing stay readable and do not compete for horizontal space.

## Testing And Verification

Unit tests:

- Parse deeplink into scheme, path, and query.
- Rebuild deeplink from structured fields.
- Collapse repeated query keys to the last value.
- Merge imported data by `id`.
- Preserve local-only records during merge.
- Replace local data only through explicit replace behavior.

Manual browser verification:

- Create a QR from a full URL.
- Edit a saved QR through both editing modes.
- Add one QR to multiple collections.
- Open a self-contained share URL without existing local data.
- Save a shared QR into local storage.
- Export data, clear data, import it back, and confirm records and relationships return.

## Implementation Boundaries

Build the static app in the new `apps/qr-vault` directory. Do not modify the existing `apps/qr-codes` server-backed app except for shared workspace configuration if required by package scripts.

Keep the first version focused on the local vault and self-contained sharing workflow. Avoid adding accounts, sync, remote storage, advanced QR styling, bulk editing, or repeated query-key support until those needs are explicit.
