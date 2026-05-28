var ZoteroNotesSync;

function log(message) {
  Zotero.debug("Zotero Notes Sync: " + message);
}

function install() {
  log("Installed");
}

async function startup({ id, version, rootURI }) {
  Zotero.PreferencePanes.register({
    pluginID: id,
    src: rootURI + "preferences.xhtml",
    scripts: [rootURI + "preferences.js"],
  });

  Services.scriptloader.loadSubScript(rootURI + "zotero-notes-sync.js");
  ZoteroNotesSync.init({ id, version, rootURI });
  ZoteroNotesSync.addToAllWindows();
}

function onMainWindowLoad({ window }) {
  ZoteroNotesSync?.addToWindow(window);
}

function onMainWindowUnload({ window }) {
  ZoteroNotesSync?.removeFromWindow(window);
}

function shutdown() {
  log("Shutting down");
  ZoteroNotesSync?.removeFromAllWindows();
  ZoteroNotesSync = undefined;
}

function uninstall() {
  log("Uninstalled");
}
