import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const dist = join(root, "dist");
const xpiName = `zotero-notes-sync-${manifest.version}.xpi`;
const files = [
  "manifest.json",
  "bootstrap.js",
  "zotero-notes-sync.js",
  "preferences.xhtml",
  "preferences.js",
  "prefs.js",
];

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const zip = spawnSync("zip", ["-X", "-r", join(dist, xpiName), ...files], {
  cwd: root,
  stdio: "inherit",
});

if (zip.status !== 0) {
  process.exit(zip.status ?? 1);
}

const update = {
  addons: {
    [manifest.applications.zotero.id]: {
      updates: [
        {
          version: manifest.version,
          update_link: `https://github.com/lojeunhou/zotero-notes-sync-zotero-plugin/releases/download/${manifest.version}/${xpiName}`,
          applications: {
            zotero: {
              strict_min_version: manifest.applications.zotero.strict_min_version,
              strict_max_version: manifest.applications.zotero.strict_max_version,
            },
          },
        },
      ],
    },
  },
};

writeFileSync(join(dist, "updates.json"), JSON.stringify(update, null, 2) + "\n");
console.log(`Built dist/${xpiName}`);
