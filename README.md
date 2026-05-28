# Zotero Notes Sync

[English](README.en.md)

Zotero Notes Sync 是一个 Zotero Desktop 插件，用来把 Zotero 笔记导出为 Markdown 文件，方便放进 Obsidian 或其他本地知识库。

## 功能

- 在 Zotero 的 Tools 菜单中添加一键同步入口。
- 将 Zotero note HTML 转换为 Markdown。
- 每条笔记生成一个 Markdown 文件。
- 写入 frontmatter：Zotero key、父条目、作者、年份、标签和 `zotero://` 链接。
- 生成 `_index.md` 和 `.zotero-notes-manifest.json`。
- 可在 Zotero 设置页选择输出文件夹。

## 安装

1. 从 GitHub Releases 下载最新的 `.xpi` 文件。
2. 打开 Zotero Desktop。
3. 进入 `Tools -> Add-ons`。
4. 点击齿轮按钮，选择 `Install Add-on From File...`。
5. 选择下载好的 `.xpi` 文件并重启 Zotero。

## 使用

1. 打开 `Zotero -> Settings -> Zotero Notes Sync`。
2. 选择 Markdown 输出文件夹。这个文件夹可以是你的 vault 内部目录，例如 `Reading Notes/Zotero Notes`。
3. 在 Zotero 的 `Tools` 菜单点击 `Sync Zotero Notes to Markdown`。

同步后会得到：

```text
Example Book [ABCD1234].md
_index.md
.zotero-notes-manifest.json
```

## 输出格式

每条笔记大致如下：

```markdown
---
source: zotero
tags:
  - zotero-note
zotero_key: "ABCD1234"
zotero_select: "zotero://select/library/items/ABCD1234"
parent_key: "PARENT01"
parent_title: "Example Book"
parent_creators:
  - "Jane Author"
parent_year: "2024"
---

# Example Book

- Zotero note: [open](zotero://select/library/items/ABCD1234)
- Zotero parent: [open](zotero://select/library/items/PARENT01)

## Note

这里是 Zotero note 的正文。
```

## 开发

运行测试：

```bash
npm test
```

打包插件：

```bash
npm run build
```

构建结果会写入 `dist/`：

```text
dist/zotero-notes-sync-0.1.0.xpi
dist/updates.json
```

## 注意事项

- 插件只读取 Zotero 笔记并写入本地 Markdown 文件，不会修改 Zotero 条目。
- 目前不同步 PDF 或附件文件。
- 同一个 Zotero note key 对应的 Markdown 文件会在下次同步时被覆盖更新。
- `manifest.json` 当前兼容范围是 Zotero 7.0 到 9.0.x。

## 许可证

MIT
