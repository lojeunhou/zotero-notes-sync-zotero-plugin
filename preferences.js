var ZoteroNotesSyncPreferences = {
  PREF_OUTPUT_DIR: "extensions.zotero-notes-sync.outputDir",
  PREF_WRITE_INDEX: "extensions.zotero-notes-sync.writeIndex",
  PREF_INCLUDE_STANDALONE: "extensions.zotero-notes-sync.includeStandaloneNotes",
  getPref(key, fallback) {
    const value = Zotero.Prefs.get(key, true);
    return value === undefined || value === null ? fallback : value;
  },

  setPref(key, value) {
    Zotero.Prefs.set(key, value, true);
  },

  createFilePicker() {
    if (typeof ChromeUtils !== "undefined" && ChromeUtils.importESModule) {
      const { FilePicker } = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
      return new FilePicker();
    }
    return Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
  },

  async openFilePicker(picker) {
    if (typeof picker.show === "function") {
      return picker.show();
    }
    return new Promise((resolve) => picker.open(resolve));
  },

  getSelectedPath(picker) {
    return typeof picker.file === "string" ? picker.file : picker.file?.path || "";
  },

  async chooseFolder() {
    const picker = this.createFilePicker();
    const modeGetFolder = picker.modeGetFolder ?? Ci.nsIFilePicker.modeGetFolder;
    const returnOK = picker.returnOK ?? Ci.nsIFilePicker.returnOK;
    const returnReplace = picker.returnReplace ?? Ci.nsIFilePicker.returnReplace;

    picker.init(window, "Choose Markdown output folder", modeGetFolder);
    const result = await this.openFilePicker(picker);
    if (result === returnOK || result === returnReplace) {
      return this.getSelectedPath(picker);
    }
    return "";
  },

  init(doc = document) {
    const outputDir = doc.getElementById("zns-output-dir");
    if (!outputDir || outputDir.dataset.znsInitialized === "true") {
      return;
    }
    outputDir.dataset.znsInitialized = "true";
    const browse = doc.getElementById("zns-browse");
    const writeIndex = doc.getElementById("zns-write-index");
    const standalone = doc.getElementById("zns-standalone");

    outputDir.value = this.getPref(this.PREF_OUTPUT_DIR, "");
    writeIndex.checked = Boolean(this.getPref(this.PREF_WRITE_INDEX, true));
    standalone.checked = Boolean(this.getPref(this.PREF_INCLUDE_STANDALONE, true));

    outputDir.addEventListener("change", () => this.setPref(this.PREF_OUTPUT_DIR, outputDir.value.trim()));
    writeIndex.addEventListener("change", () => this.setPref(this.PREF_WRITE_INDEX, writeIndex.checked));
    standalone.addEventListener("change", () => this.setPref(this.PREF_INCLUDE_STANDALONE, standalone.checked));
    browse.addEventListener("click", async () => {
      const folder = await this.chooseFolder();
      if (folder) {
        outputDir.value = folder;
        this.setPref(this.PREF_OUTPUT_DIR, folder);
      }
    });
  },
};
