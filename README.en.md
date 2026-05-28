# Zotero Notes Sync

Zotero Notes Sync is a Zotero Desktop plugin that exports Zotero notes to Markdown files for Obsidian or any local knowledge base.

## Features

- Adds a one-click sync action to Zotero's Tools menu.
- Converts Zotero note HTML to Markdown.
- Writes one Markdown file per Zotero note.
- Adds frontmatter with Zotero keys, parent item metadata, creators, year, tags, and `zotero://` links.
- Writes `_index.md` and `.zotero-notes-manifest.json`.
- Lets users choose the output folder from the Zotero settings pane.

## Install

1. Download the latest `.xpi` file from GitHub Releases.
2. Open Zotero Desktop.
3. Go to `Tools -> Add-ons`.
4. Click the gear button and choose `Install Add-on From File...`.
5. Select the downloaded `.xpi` file and restart Zotero.

## Use

1. Open `Zotero -> Settings -> Zotero Notes Sync`.
2. Choose the Markdown output folder. This can be a folder inside your vault, such as `Reading Notes/Zotero Notes`.
3. Click `Sync Zotero Notes to Markdown` from Zotero's `Tools` menu.

## Development

Run tests:

```bash
npm test
```

Build the XPI package:

```bash
npm run build
```

Build artifacts are written to `dist/`.

## Notes

- The plugin reads Zotero notes and writes local Markdown files. It does not modify Zotero items.
- PDF and attachment extraction is not implemented yet.
- Markdown files are overwritten on the next sync when they share the same Zotero note key.
- `manifest.json` currently targets Zotero 7.0 through 9.0.x.

## License

MIT
