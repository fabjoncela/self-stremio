# Private forced streaming-server patch

Base upstream revision: `b6cf70264bdca43f2bb983f26050bc7aed3a8481` (reviewed 2026-09-18).

This local source patch makes the browser client use only
`https://fabjon-hp.tail681ec9.ts.net:3010/stremio-server/`, the same-origin
Caddy reverse-proxy path to the existing streaming server.

- `src/App/SearchParamsHandler.js` replaces Stremio Web's URL-parameter and
  saved-preference handler with an effect that resets the profile setting to
  the forced Tailnet URL whenever it differs. This covers initial load and
  later profile changes caused by sign-in or sign-out.
- `src/routes/Settings/Streaming/Streaming.tsx` and
  `src/routes/Settings/Settings.tsx` remove the streaming-server URL manager
  from Settings, so the hosted client offers no selector or URL-entry control,
  while retaining the `profile` prop required by other Streaming settings.
- `src/routes/Player/Player.js` retains the upstream optional
  `?forceTranscoding` behavior and exposes it only as an explicit retry. When
  iOS reports an unsupported-media error during direct playback, the error
  screen offers **Try compatible playback**. That replaces the current player
  URL's query with `forceTranscoding=1`, retrying only the selected source
  through the engine HLS path. Direct browser playback remains the default.
  For the private Downloads workflow, a completed-copy stream reaching 90%
  playback posts its opaque URL and progress to the same-origin queue service;
  the service schedules its existing 24-hour cleanup window. Other streams
  are ignored.
  A 2026-09-19 attempt to force HLS for every browser stream was rolled back
  because this installed Web/core combination immediately reported
  “unsupported” even for streams that previously worked; the engine received
  no HLS request.
- `src/components/MainNavBars/MainNavBars.tsx` adds the private Downloads page
  link. `src/routes/MetaDetails/StreamsList/Stream/Stream.js` adds an iPhone
  compatibility hint only for the configured Torznab add-on and release names
  that explicitly indicate H.264/AVC plus AAC without known incompatible codec
  labels. This is a filename-based hint, not a playback guarantee.
- `Dockerfile` copies the upstream `patches/` directory before the frozen
  dependency installation. The reviewed upstream revision's lockfile requires
  `patches/a-color-picker@1.2.1.patch`; without this order the official build
  fails before compiling the client.
- `.dockerignore` retains `.git` in the build context because the upstream
  webpack configuration runs `git rev-parse HEAD` during compilation to embed
  the source revision. It still excludes generated dependency and build
  directories.
- `webpack.config.js` and `Dockerfile` give this patched deployment the fixed
  build asset namespace `b6cf70264bdca43f2bb983f26050bc7aed3a8481-private-caddy-v7-iphone-badge`.
  Stremio Web's service worker otherwise keys static assets only by upstream
  Git commit and could reuse a prior local build from cache. Increment this
  suffix for every browser-behaviour patch; v4 rolled back the failed universal
  HLS policy, v5 adds the iOS-only selective retry, v6 carries the
  streaming-path preservation patch below, and v7 adds the iPhone codec hint
  and completed-copy cleanup callback.
- Caddy overrides caching for `/`, `/index.html`, and `/service-worker.js` with
  `Cache-Control: no-cache, no-store, must-revalidate`. The upstream static
  server otherwise advertises a roughly 30-day service-worker cache lifetime,
  which prevented Safari from receiving the v3 build during the first physical
  iPhone test. These headers remain in place so the v4 rollback reaches clients.
- Caddy proxies both `/stremio-server/*` and the root-relative `/hlsv2/*` paths
  to the private gateway. `stremio-video` forms HLS requests with an absolute
  `/hlsv2/` path, which would otherwise reach the static Web service and return
  404. This route is same-origin, Tailnet-only, and has no separate listener.
- Caddy also proxies only root paths shaped as a 40-hex torrent info-hash plus
  its file/operation suffix (for example, `/<info-hash>/<file-index>`). The
  same video package creates those URLs relative to the site root before the
  HLS retry passes one back to the engine. Without this narrow route, Caddy's
  static service returns 404 and the HLS engine immediately fails to open its
  media input. Arbitrary root paths remain static-Web paths.
- `patches/@stremio__stremio-video@0.0.97.patch` changes the installed video
  package's streaming-server URL construction to preserve the configured
  `/stremio-server/` prefix instead of resolving its engine URLs at the site
  root. It covers torrent creation/file URLs, HLS probe/master/subtitle URLs,
  proxy URLs, and auxiliary metadata requests. The patch is recorded in both
  `pnpm-workspace.yaml` and `pnpm-lock.yaml`, so frozen production installs
  apply it reproducibly; `v6` or newer is required for clients to receive it.
- Caddy writes a narrowly scoped diagnostic access entry only for `/hlsv2/*`
  retry requests to the existing `stremio-web-caddy` Docker log. It retains
  only outcome metadata (such as status, size, and duration); request URL and
  query, headers, client address, and response headers are removed. This is
  intended to distinguish a missing retry request from a gateway/engine failure
  without retaining source-specific data.

The concrete source and dependency patches are retained in this pinned
checkout. Before upgrading the source revision, review and reapply them, then
repeat the deployment verification in `/home/fabjon/codex-memory/STREMIO-WEB.md`.
