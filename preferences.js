(function () {
  const PREF_OUTPUT_DIR = "extensions.zotero-notes-sync.outputDir";
  const PREF_WRITE_INDEX = "extensions.zotero-notes-sync.writeIndex";
  const PREF_INCLUDE_STANDALONE = "extensions.zotero-notes-sync.includeStandaloneNotes";

  function getPref(key, fallback) {
    const value = Zotero.Prefs.get(key, true);
    return value === undefined || value === null ? fallback : value;
  }

  function setPref(key, value) {
    Zotero.Prefs.set(key, value, true);
  }

  async function chooseFolder() {
    const picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    picker.init(window, "Choose Markdown output folder", Ci.nsIFilePicker.modeGetFolder);
    const result = await new Promise((resolve) => picker.open(resolve));
    if (result === Ci.nsIFilePicker.returnOK || result === Ci.nsIFilePicker.returnReplace) {
      return picker.file.path;
    }
    return "";
  }

  window.addEventListener("DOMContentLoaded", () => {
    const outputDir = document.getElementById("zns-output-dir");
    const browse = document.getElementById("zns-browse");
    const writeIndex = document.getElementById("zns-write-index");
    const standalone = document.getElementById("zns-standalone");

    outputDir.value = getPref(PREF_OUTPUT_DIR, "");
    writeIndex.checked = Boolean(getPref(PREF_WRITE_INDEX, true));
    standalone.checked = Boolean(getPref(PREF_INCLUDE_STANDALONE, true));

    outputDir.addEventListener("change", () => setPref(PREF_OUTPUT_DIR, outputDir.value.trim()));
    writeIndex.addEventListener("change", () => setPref(PREF_WRITE_INDEX, writeIndex.checked));
    standalone.addEventListener("change", () => setPref(PREF_INCLUDE_STANDALONE, standalone.checked));
    browse.addEventListener("click", async () => {
      const folder = await chooseFolder();
      if (folder) {
        outputDir.value = folder;
        setPref(PREF_OUTPUT_DIR, folder);
      }
    });
  });
})();
