# 兼容说明

## 配置格式

`tvbox.json` 使用 FongMi / TVBox 常见配置结构：

- `sites`：点播来源。
- `sites[].type = 3`：CatVod Spider。
- `sites[].api`：JS Spider 路径或 URL。
- `sites[].ext`：传入 Spider `init()` 的配置对象。
- `sites[].searchable = 1`：启用搜索。
- `sites[].quickSearch = 1`：启用快速搜索。
- `sites[].filterable = 1`：启用筛选。

## Spider 方法

`spider/ddys.js` 同时提供长方法名和短方法名：

- `homeContent(filter)` / `home(filter)`
- `homeVideoContent()` / `homeVod()`
- `categoryContent(tid, pg, filter, extend)` / `category(tid, pg, filter, extend)`
- `detailContent(ids)` / `detail(ids)`
- `searchContent(key, quick, pg)` / `search(key, quick, pg)`
- `playerContent(flag, id, flags)` / `play(flag, id, flags)`
- `__jsEvalReturn()`

这样可以兼容不同 CatVod JS runtime 对导出对象的读取方式。

## FongMi

推荐使用远程配置：

```text
https://raw.githubusercontent.com/ddysiodev/ddys-tvbox/main/tvbox.json
```

如果客户端无法加载 GitHub Raw，可以把整个仓库放到自己的静态托管中，再把 `sites[].api` 改为你的 `spider/ddys.js` 地址。

## 影视仓 / OK影视 / TVBox 分支

这些客户端通常兼容 TVBox / FongMi 配置，但不同版本对 JS Spider、远程路径和 `ext` 对象支持不完全一致。遇到加载失败时，建议：

1. 使用 Release ZIP 中的本地文件。
2. 把 `tvbox.json`、`spider/ddys.js` 放在同一个可访问域名下。
3. 如果内联 `ext` 不生效，改用 `examples/tvbox-remote.json` 的远程 `ext` 写法。

## 资源类型

- 直链视频、HLS、MP4：Spider 返回 `parse: 0`。
- 普通网页或网盘链接：Spider 返回 `parse: 1`，由客户端自行处理或嗅探。
- 下载、磁力、网盘资源：会出现在详情页内容和线路列表中，但实际能否打开取决于客户端播放器。

## Release 打包

- Release ZIP 使用固定排序、固定 ZIP 时间戳和 STORE 模式，避免不同机器生成不同资产。
- `.sha256` 使用稳定 ASCII 内容，无尾随换行。
- `.gitattributes` 固定文本文件 LF，避免 Windows CI checkout 改写换行导致 ZIP SHA 不一致。
