# `core/preload/`

The preload script, runs in the Chromium renderer process in the isolated
preload world. Acts as a bridge between the main process and renderer.
Responsible for:

- Communicating with the main process via IPC
- Updating a `<style>` tag with the contents of `user.css`
- Exposing `window.TautBridge` to the renderer process via `contextBridge`
- Fetching and `eval`ing Slack's original preload script

Environment: Electron renderer process preload script (Chromium, DOM access +
limited Electron APIs including IPC), browser JavaScript

- `preload.js`: Main preload script, loaded via the `preload` option when
  creating BrowserWindow
