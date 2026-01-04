# `core/main/`

The main process code, runs in the Electron main process before Slack starts.
Responsible for:

- Monkey patching Electron APIs to inject the preload script and renderer code
  (plus other tweaks like enabling devtools and bypassing CORS)
- Reading and watching the config dir for changes
- Building plugins with esbuild (running in WASM)
- Communicating with the preload/renderer via IPC
- Injecting built plugins into the renderer to load them (bypassing the CSP)

Environment: Electron main process (Node.js + Electron APIs), CommonJS

- `main.cjs`: Entrypoint, imported by [`cli/shim.cjs`](../../cli/shim.cjs).
  Loads other modules.
- `patch.cjs`: Electron monkey-patching: BrowserWindow proxy, Module.\_load
  override, CORS bypass, application menu injection, and React DevTools
  installation
- `plugins.cjs`: Plugin manager: discovery, bundling with esbuild, config/CSS
  watching, and IPC handlers
- `helpers.cjs`: Shared utilities, constants, and path definitions
- `deps.ts`: ESM TypeScript module exporting functions using NPM dependencies,
  bundled by Bun into `deps/`
- `deps/`: .gitignore'd directory where Bun outputs the bundled dependencies as
  CommonJS files when running `bun run build`
  - `deps.bundle.js`: CommonJS bundled dependencies
  - `esbuild.wasm`: The esbuild WASM binary

IPC Handlers:

- `taut:start-plugins`: Triggers plugin loading and returns plugin list
- `taut:get-config-dir`: Returns the `PATHS` object with config directory info
