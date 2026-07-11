# API 映射

| TVBox 能力 | DDYS API |
| --- | --- |
| 首页推荐 | `GET /latest?limit=...` |
| 最新分类 | `GET /latest?limit=...` |
| 热门分类 | `GET /hot?limit=...` |
| 类型分类 | `GET /movies?type=...&page=...&per_page=...` |
| 搜索 | `GET /search?q=...&page=...&per_page=...` |
| 详情 | `GET /movies/{slug}` |
| 资源 | `GET /movies/{slug}/sources` |
| 相关内容 | `GET /movies/{slug}/related` |

公开读取接口默认不需要 API Key。如果配置了 `apiKey`，Spider 会给 DDYS API 请求加上：

```http
Authorization: Bearer <apiKey>
```
