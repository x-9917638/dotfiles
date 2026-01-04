# `core/renderer/`

The renderer process code, runs in the Chromium renderer process in the main
world alongside the Slack frontend. Responsible for:

- Communicating with the preload script via the `window.TautBridge` object
- Loading and managing Taut plugins
  - Accepting new plugin code injected by the main process
  - Instantiating and initializing plugins
  - Loading, reloading, and unloading plugins as the config changes
- Adding a Taut settings tab to Slack preferences
- Webpack module interception and React component patching

Environment: Bundled by esbuild, Electron renderer process main world (Chromium,
alongside Slack frontend), TypeScript ESM with JSX

- `main.ts`: Entrypoint, bundled and executed in the renderer main world by
  [`main.cjs`](../main/main.cjs). Imports `client.ts`.
- `client.ts`: Contains the `PluginManager` class and `TautAPI`.
- `css.ts`: Utilities for injecting and removing CSS styles.
- `react.tsx`: React utilities, including `patchComponent` for replacing Slack
  components at runtime.
- `webpack.ts`: Webpack utilities for finding Slack's internal modules
