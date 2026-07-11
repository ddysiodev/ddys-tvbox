# DDYS TVBox

DDYS TVBox is the official TVBox / FongMi / CatVod integration package for the DDYS API. It ships a ready-to-import TVBox JSON config and a CatVod JavaScript spider.

## Features

- TVBox config JSON: `tvbox.json`
- CatVod JS Spider: `spider/ddys.js`
- FongMi / TVBox-compatible client notes
- Home recommendations from latest updates
- Categories for latest, hot, movies, series, anime, variety, and documentary
- Search and pagination
- Detail pages with metadata, resource groups, and related items
- Play groups for online, download, cloud drive, and other resources
- Configurable API Base
- Optional API Key with `Authorization: Bearer`
- Local checks, unit tests, and Release ZIP

## Usage

Use this config URL in a TVBox/FongMi-compatible client:

```text
https://raw.githubusercontent.com/ddysiodev/ddys-tvbox/main/tvbox.json
```

Public read endpoints do not require an API key. Configure `sites[0].ext.apiKey` only when your API Base requires authentication.

## License

MIT
