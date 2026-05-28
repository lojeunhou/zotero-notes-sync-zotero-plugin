const assert = require("node:assert/strict");
const sync = require("../zotero-notes-sync.js");

const markdown = sync.htmlToMarkdown(
  '<div><h2>Notes</h2><ul><li><p>First</p></li><li><strong>Second</strong></li></ul><p>Read <a href="https://example.com">this</a>.</p></div>',
);

assert.match(markdown, /## Notes/);
assert.match(markdown, /- First/);
assert.match(markdown, /- \*\*Second\*\*/);
assert.match(markdown, /\[this\]\(https:\/\/example.com\)/);

assert.equal(sync.safeFilename('A/B:C*"D"?', "ABCD1234"), "A - B - C - D [ABCD1234].md");

const built = sync.buildMarkdown(
  {
    key: "NOTE1234",
    version: 7,
    getNote() {
      return "<p>Hello <strong>world</strong>.</p>";
    },
    getTags() {
      return [{ tag: "reading" }];
    },
  },
  {
    key: "PARENT01",
    itemTypeID: 2,
    getField(field) {
      return {
        title: "Example Book",
        date: "2024",
      }[field] || "";
    },
    getCreatorsJSON() {
      return [{ firstName: "Jane", lastName: "Author" }];
    },
  },
  "2026-05-29T00:00:00.000Z",
);

assert.equal(built.filename, "Example Book [NOTE1234].md");
assert.match(built.markdown, /parent_key: "PARENT01"/);
assert.match(built.markdown, /- "Jane Author"/);
assert.match(built.markdown, /Hello \*\*world\*\*\./);

console.log("All tests passed");
