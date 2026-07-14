# DDYS TVBox

DDYS TVBox is the TVBox / FongMi / CatVod-compatible integration package for the DDYS API. It ships a ready-to-import `tvbox.json` config and a CatVod JavaScript Spider.

## Features

- TVBox config JSON: `tvbox.json`
- CatVod JS Spider: `spider/ddys.js`
- Compatibility notes for FongMi, TVBox forks, and similar clients
- Home recommendations from latest updates
- Categories for latest, hot, movies, series, anime, variety, and documentaries
- Search and pagination
- Detail pages with metadata, resource groups, and related items
- Play groups for online, download, cloud-drive, and other resources
- Configurable API Base for the official API or a self-hosted Worker proxy
- Optional API Key with `Authorization: Bearer <apiKey>`
- Local checks, unit tests, CI, deterministic Release ZIP, and `.sha256`

## Release assets

The GitHub Release contains:

```text
ddys-tvbox-v0.1.1.zip
ddys-tvbox-v0.1.1.zip.sha256
```

The ZIP includes config files, Spider source, examples, docs, tests, and self-check/package scripts. It excludes `node_modules`, coverage output, local environment files, and temporary artifacts.

Verify:

```powershell
Get-FileHash .\ddys-tvbox-v0.1.1.zip -Algorithm SHA256
Get-Content .\ddys-tvbox-v0.1.1.zip.sha256
```

## Usage

Use this config URL in a TVBox/FongMi-compatible client:

```text
https://raw.githubusercontent.com/ddysiodev/ddys-tvbox/main/tvbox.json
```

If GitHub Raw is unstable for your client, download the Release ZIP and host `tvbox.json`, `spider/ddys.js`, and `config/ext.json` on your own static host or Worker.

Public read endpoints do not require an API key. Configure `sites[0].ext.apiKey` only when your API Base requires authentication.

## Local checks

```text
node tools/check.mjs
node --test tests/*.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tools/build-package.ps1
```

The package script emits a deterministic ZIP plus a stable ASCII `.sha256` file.

## License

MIT
