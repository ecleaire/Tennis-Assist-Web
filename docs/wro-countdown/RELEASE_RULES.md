# WRO Countdown release rules

These rules apply to every change under `docs/wro-countdown/`.

1. Treat a requested change as incomplete until it is committed, pushed to a branch, merged into `main`, and verified on the public GitHub Pages URL.
2. Run the full WRO Countdown checks before merge. Fix failures and likely regressions instead of knowingly merging them.
3. Bump the visible app version for every published update. Use patch releases for fixes and minor releases for new user-visible behavior or infrastructure.
4. Keep the update date in the settings screen current.
5. Do not rely on stale per-file cache query strings for freshness. `sw.js` is scoped to `/wro-countdown/` and fetches same-origin GET requests with `cache: no-store` so HTML, JS, CSS, and local assets are revalidated from the network on each load.
6. Register the service worker with `updateViaCache: "none"`, keep the HTML no-cache metadata, and preserve the cache-freshness automated check.
7. When changing timer sizing, test both the finite slider and the unlimited numeric input. A missing `max` attribute must mean no upper limit, never zero.
8. After merging, verify the current public page and the version shown in Settings. If GitHub Pages is still propagating, verify again before reporting publication complete.
