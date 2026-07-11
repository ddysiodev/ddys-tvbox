# DDYS TVBox

DDYS TVBox 是低端影视 API 的官方 TVBox / FongMi / 影视仓 / OK影视配置包，包含可直接导入的 TVBox 配置 JSON 和 CatVod JS Spider。

## 功能

- TVBox 配置 JSON：`tvbox.json`
- CatVod JS Spider：`spider/ddys.js`
- FongMi / 影视仓 / OK影视兼容说明
- 首页推荐：最新更新
- 分类入口：最新、热门、电影、剧集、动漫、综艺、纪录片
- 分类筛选：支持按排序参数透传给 DDYS API
- 搜索：关键词搜索和分页
- 详情页：影片信息、资源列表、相关内容
- 播放线路：在线播放、下载资源、网盘资源、其他资源分组
- API Base 可配置：官方 API 或自建 Worker Proxy
- API Key 可选：公开读取接口默认不需要
- 本地自检、单测、Release ZIP

## 使用

把以下地址填入 TVBox、FongMi、影视仓或 OK影视的配置地址：

```text
https://raw.githubusercontent.com/ddysiodev/ddys-tvbox/main/tvbox.json
```

如果 GitHub Raw 访问不稳定，可以下载 Release ZIP，把 `tvbox.json`、`spider/ddys.js` 和 `config/ext.json` 放到自己的静态托管或 Worker 中。

## 修改 API Base

默认 API Base：

```text
https://ddys.io/api/v1
```

如果你部署了 DDYS Worker Proxy，可以把 `tvbox.json` 中 `sites[0].ext.apiBase` 改为自己的代理地址，例如：

```text
https://example.com/ddys-api
```

公开读取接口默认不需要 API Key。只有你的 API Base 启用了鉴权，或需要调用认证能力时，才填写 `apiKey`。Spider 会使用：

```http
Authorization: Bearer <apiKey>
```

## 兼容客户端

- FongMi TV：推荐，支持 `type: 3` JS Spider。
- 影视仓：通常兼容 TVBox/FongMi 配置格式。
- OK影视：通常兼容 TVBox/FongMi 配置格式。
- TVBox 及其分支：需支持 CatVod JS Spider。

不同客户端对相对路径和远程 JS 的处理略有差异。主配置 `tvbox.json` 已把 `ext` 内联，减少路径加载问题；`examples/tvbox-remote.json` 展示了远程 JS 和远程 ext 的写法。

## 资源说明

DDYS API 返回的在线播放地址会作为播放线路展示。下载、网盘、磁力等资源也会展示在详情页和线路中；如果客户端播放器不支持直接打开该类链接，建议复制链接或用外部应用处理。

## 文件结构

```text
ddys-tvbox/
├── tvbox.json
├── config/
│   ├── ext.json
│   └── subscription.json
├── spider/
│   └── ddys.js
├── examples/
├── docs/
├── tests/
└── tools/
```

## 本地检查

```bash
node tools/check.mjs
node --test tests/*.test.mjs
```

## License

MIT
