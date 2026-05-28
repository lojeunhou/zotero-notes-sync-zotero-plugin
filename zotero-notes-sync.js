var ZoteroNotesSync = (function () {
  const PLUGIN_NAME = "Zotero Notes Sync";
  const MENU_ID = "zotero-notes-sync-tools-menu";
  const PREF_OUTPUT_DIR = "extensions.zotero-notes-sync.outputDir";
  const PREF_WRITE_INDEX = "extensions.zotero-notes-sync.writeIndex";
  const PREF_INCLUDE_STANDALONE = "extensions.zotero-notes-sync.includeStandaloneNotes";

  function getPref(key, fallback) {
    try {
      const value = Zotero.Prefs.get(key, true);
      return value === undefined || value === null ? fallback : value;
    } catch (_err) {
      return fallback;
    }
  }

  function setPref(key, value) {
    Zotero.Prefs.set(key, value, true);
  }

  function decodeEntities(value) {
    return String(value || "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)));
  }

  function stripTags(value) {
    return decodeEntities(String(value || "").replace(/<[^>]+>/g, " "));
  }

  function htmlToPlainText(value) {
    return stripTags(value)
      .replace(/\s+/g, " ")
      .trim();
  }

  function htmlToMarkdown(value) {
    let html = String(value || "");
    html = html.replace(/\r\n?/g, "\n");
    html = html.replace(/<br\s*\/?>/gi, "\n");
    html = html.replace(/<\/(p|div|section|article|blockquote)>/gi, "\n\n");
    html = html.replace(/<(p|div|section|article)[^>]*>/gi, "\n\n");
    html = html.replace(/<h([1-6])[^>]*>/gi, (_match, level) => "\n\n" + "#".repeat(Number(level)) + " ");
    html = html.replace(/<\/h[1-6]>/gi, "\n\n");
    html = html.replace(/<li[^>]*>/gi, "\n- ");
    html = html.replace(/<\/li>/gi, "\n");
    html = html.replace(/<\/?(ul|ol)[^>]*>/gi, "\n");
    html = html.replace(/<(strong|b)[^>]*>/gi, "**");
    html = html.replace(/<\/(strong|b)>/gi, "**");
    html = html.replace(/<(em|i)[^>]*>/gi, "*");
    html = html.replace(/<\/(em|i)>/gi, "*");
    html = html.replace(/<code[^>]*>/gi, "`");
    html = html.replace(/<\/code>/gi, "`");
    html = html.replace(/<blockquote[^>]*>/gi, "\n\n> ");
    html = html.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis, (_match, href, text) => {
      return `[${stripTags(text).trim()}](${href})`;
    });
    html = html.replace(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi, (_match, src) => `![](${src})`);
    html = stripTags(html);
    return html
      .replace(/[ \t]+\n/g, "\n")
      .replace(/(^|\n)(\s*[-*])\s*\n+(\S)/g, "$1$2 $3")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\s+/g, "")
      .replace(/\s+$/g, "")
      .trim();
  }

  function firstLine(value) {
    return String(value || "")
      .split(/\n/)
      .map((line) => line.trim())
      .find(Boolean) || "";
  }

  function yamlQuote(value) {
    return JSON.stringify(String(value || ""));
  }

  function yamlList(values) {
    if (!values || !values.length) {
      return "[]";
    }
    return "\n" + values.map((value) => `  - ${yamlQuote(value)}`).join("\n");
  }

  function safeFilename(title, key) {
    let clean = String(title || "")
      .replace(/[\\/:*"<>|#^[\]?]+/g, " - ")
      .replace(/\s+/g, " ")
      .replace(/^[ .-]+|[ .-]+$/g, "");
    if (!clean) {
      clean = "Zotero Note";
    }
    if (clean.length > 120) {
      clean = clean.slice(0, 120).replace(/[ .-]+$/g, "");
    }
    return `${clean} [${key}].md`;
  }

  function creatorName(creator) {
    if (!creator) {
      return "";
    }
    if (creator.name) {
      return creator.name;
    }
    return [creator.firstName, creator.lastName].filter(Boolean).join(" ").trim();
  }

  function itemYear(item) {
    const date = getItemField(item, "date");
    const match = String(date || "").match(/\b(\d{4})\b/);
    return match ? match[1] : "";
  }

  function getItemField(item, field) {
    if (!item) {
      return "";
    }
    try {
      if (typeof item.getField === "function") {
        return item.getField(field) || "";
      }
    } catch (_err) {
      return "";
    }
    return item[field] || "";
  }

  function getTags(item) {
    try {
      return item.getTags().map((tag) => tag.tag).filter(Boolean);
    } catch (_err) {
      return [];
    }
  }

  function getCreators(item) {
    if (!item) {
      return [];
    }
    try {
      if (typeof item.getCreatorsJSON === "function") {
        return item.getCreatorsJSON().map(creatorName).filter(Boolean);
      }
      if (typeof item.getCreators === "function") {
        return item.getCreators().map(creatorName).filter(Boolean);
      }
    } catch (_err) {
      return [];
    }
    return [];
  }

  function getItemTypeName(item) {
    if (!item || !item.itemTypeID) {
      return "";
    }
    try {
      return Zotero.ItemTypes.getName(item.itemTypeID) || "";
    } catch (_err) {
      return "";
    }
  }

  async function getParentItem(note) {
    if (!note || !note.parentItemID) {
      return null;
    }
    try {
      return await Zotero.Items.getAsync(note.parentItemID);
    } catch (_err) {
      try {
        return Zotero.Items.get(note.parentItemID);
      } catch (_err2) {
        return null;
      }
    }
  }

  function buildMarkdown(note, parent, generatedAt) {
    const key = note.key || "";
    const parentKey = parent?.key || "";
    const noteHtml = typeof note.getNote === "function" ? note.getNote() : note.note || "";
    const notePlain = htmlToPlainText(noteHtml);
    const noteMarkdown = htmlToMarkdown(noteHtml);
    const noteTitle = firstLine(notePlain);
    const parentTitle = getItemField(parent, "title");
    const displayTitle = parentTitle || noteTitle || `Zotero Note ${key}`;
    const parentCreators = getCreators(parent);
    const tags = getTags(note);
    const filename = safeFilename(displayTitle, key);
    const dateAdded = note.dateAdded || getItemField(note, "dateAdded");
    const dateModified = note.dateModified || getItemField(note, "dateModified");
    const parentType = getItemTypeName(parent);
    const parentYear = itemYear(parent);

    const frontmatter = [
      "---",
      "source: zotero",
      "tags:",
      "  - zotero-note",
      `zotero_key: ${yamlQuote(key)}`,
      `zotero_version: ${note.version || ""}`,
      `zotero_select: ${yamlQuote(`zotero://select/library/items/${key}`)}`,
      `parent_key: ${yamlQuote(parentKey)}`,
      `parent_title: ${yamlQuote(parentTitle)}`,
      `parent_type: ${yamlQuote(parentType)}`,
      `parent_year: ${yamlQuote(parentYear)}`,
      `parent_creators: ${yamlList(parentCreators)}`,
      `zotero_tags: ${yamlList(tags)}`,
      `date_added: ${yamlQuote(dateAdded)}`,
      `date_modified: ${yamlQuote(dateModified)}`,
      `synced_at: ${yamlQuote(generatedAt)}`,
      "---",
      "",
    ];

    const body = [
      `# ${displayTitle}`,
      "",
      `- Zotero note: [open](zotero://select/library/items/${key})`,
    ];
    if (parentKey) {
      body.push(`- Zotero parent: [open](zotero://select/library/items/${parentKey})`);
    }
    if (parentCreators.length) {
      body.push(`- Creators: ${parentCreators.join(", ")}`);
    }
    if (parentType) {
      body.push(`- Parent item: ${parentType}${parentYear ? `, ${parentYear}` : ""}`);
    }
    if (noteTitle && noteTitle !== displayTitle) {
      body.push(`- Note starts: ${noteTitle}`);
    }
    body.push("", "## Note", "", noteMarkdown || "_Empty Zotero note._", "");

    return {
      filename,
      markdown: frontmatter.concat(body).join("\n"),
      metadata: {
        key,
        file: filename,
        title: displayTitle,
        parent_key: parentKey,
        parent_title: parentTitle,
        date_modified: dateModified || "",
      },
    };
  }

  function buildIndex(manifest, generatedAt) {
    const lines = [
      "# Zotero Notes Index",
      "",
      `Synced at: ${generatedAt}`,
      `Total notes: ${manifest.length}`,
      "",
      "## Notes",
      "",
    ];
    manifest
      .slice()
      .sort((a, b) => `${a.title} ${a.key}`.localeCompare(`${b.title} ${b.key}`))
      .forEach((entry) => {
        const stem = entry.file.replace(/\.md$/i, "");
        const parentBit = entry.parent_key ? ` · parent \`${entry.parent_key}\`` : "";
        lines.push(`- [[${stem}|${entry.title}]] \`${entry.key}\`${parentBit}`);
      });
    return lines.join("\n") + "\n";
  }

  async function getLibraryIDs() {
    try {
      if (Zotero.Libraries?.getAll) {
        return Zotero.Libraries.getAll().map((library) => library.libraryID);
      }
    } catch (_err) {
      // Fall through to user library.
    }
    return [Zotero.Libraries.userLibraryID];
  }

  async function fetchNotes(includeStandaloneNotes) {
    const libraryIDs = await getLibraryIDs();
    const notes = [];
    for (const libraryID of libraryIDs) {
      const search = new Zotero.Search();
      search.libraryID = libraryID;
      search.addCondition("itemType", "is", "note");
      const ids = await search.search();
      if (!ids?.length) {
        continue;
      }
      const items = await Zotero.Items.getAsync(ids);
      for (const item of items) {
        if (!item) {
          continue;
        }
        if (!includeStandaloneNotes && !item.parentItemID) {
          continue;
        }
        notes.push(item);
      }
    }
    return notes.sort((a, b) => `${a.libraryID}:${a.key}`.localeCompare(`${b.libraryID}:${b.key}`));
  }

  async function writeFile(path, contents) {
    await IOUtils.writeUTF8(path, contents);
  }

  async function syncNotes(options) {
    const outputDir = options.outputDir;
    const writeIndex = options.writeIndex;
    const includeStandaloneNotes = options.includeStandaloneNotes;
    const generatedAt = new Date().toISOString();
    const notes = await fetchNotes(includeStandaloneNotes);
    const manifest = [];

    await IOUtils.makeDirectory(outputDir, { createAncestors: true, ignoreExisting: true });

    for (const note of notes) {
      const parent = await getParentItem(note);
      const built = buildMarkdown(note, parent, generatedAt);
      manifest.push(built.metadata);
      await writeFile(PathUtils.join(outputDir, built.filename), built.markdown);
    }

    await writeFile(
      PathUtils.join(outputDir, ".zotero-notes-manifest.json"),
      JSON.stringify(
        {
          generated_at: generatedAt,
          source: "zotero-desktop",
          target_dir: outputDir,
          note_count: manifest.length,
          notes: manifest.slice().sort((a, b) => a.key.localeCompare(b.key)),
        },
        null,
        2,
      ) + "\n",
    );

    if (writeIndex) {
      await writeFile(PathUtils.join(outputDir, "_index.md"), buildIndex(manifest, generatedAt));
    }

    return { noteCount: notes.length, outputDir };
  }

  async function chooseOutputDir(window) {
    const picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    picker.init(window, "Choose Markdown output folder", Ci.nsIFilePicker.modeGetFolder);
    const result = await new Promise((resolve) => picker.open(resolve));
    if (result === Ci.nsIFilePicker.returnOK || result === Ci.nsIFilePicker.returnReplace) {
      const path = picker.file.path;
      setPref(PREF_OUTPUT_DIR, path);
      return path;
    }
    return "";
  }

  async function promptForOutputDir(window) {
    let outputDir = String(getPref(PREF_OUTPUT_DIR, "") || "").trim();
    if (outputDir) {
      return outputDir;
    }
    return chooseOutputDir(window);
  }

  async function syncFromWindow(window) {
    try {
      const outputDir = await promptForOutputDir(window);
      if (!outputDir) {
        Services.prompt.alert(window, PLUGIN_NAME, "Choose an output folder before syncing.");
        return;
      }
      const result = await syncNotes({
        outputDir,
        writeIndex: Boolean(getPref(PREF_WRITE_INDEX, true)),
        includeStandaloneNotes: Boolean(getPref(PREF_INCLUDE_STANDALONE, true)),
      });
      Services.prompt.alert(
        window,
        PLUGIN_NAME,
        `Synced ${result.noteCount} Zotero notes to:\n${result.outputDir}`,
      );
    } catch (err) {
      Zotero.debug(err, 1);
      Services.prompt.alert(window, PLUGIN_NAME, `Sync failed:\n${err.message || err}`);
    }
  }

  function addToWindow(window) {
    const doc = window.document;
    if (doc.getElementById(MENU_ID)) {
      return;
    }

    const popup = doc.getElementById("menu_ToolsPopup") || doc.getElementById("menu_toolsPopup");
    if (!popup) {
      return;
    }

    const menuitem = doc.createXULElement("menuitem");
    menuitem.id = MENU_ID;
    menuitem.setAttribute("label", "Sync Zotero Notes to Markdown");
    menuitem.addEventListener("command", () => syncFromWindow(window));
    popup.appendChild(menuitem);
  }

  function removeFromWindow(window) {
    window.document.getElementById(MENU_ID)?.remove();
  }

  function addToAllWindows() {
    const windows = Zotero.getMainWindows ? Zotero.getMainWindows() : [Zotero.getMainWindow()];
    for (const window of windows) {
      if (window) {
        this.addToWindow(window);
      }
    }
  }

  function removeFromAllWindows() {
    const windows = Zotero.getMainWindows ? Zotero.getMainWindows() : [Zotero.getMainWindow()];
    for (const window of windows) {
      if (window) {
        this.removeFromWindow(window);
      }
    }
  }

  return {
    init(info) {
      this.info = info;
    },
    addToWindow,
    removeFromWindow,
    addToAllWindows,
    removeFromAllWindows,
    syncNotes,
    htmlToMarkdown,
    htmlToPlainText,
    safeFilename,
    buildMarkdown,
    buildIndex,
  };
})();

if (typeof module !== "undefined") {
  module.exports = ZoteroNotesSync;
}
