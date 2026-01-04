# `core/`

The core of Taut, all the code that is injected into Slack. When Taut updates,
the entire `core/` directory is replaced.

- `core/main/`: The main process code, runs in the Electron main process before
  Slack starts
- `core/preload/`: The preload script, runs in the Chromium renderer process in
  the isolated preload world. Exposes `TautBridge` for IPC.
- `core/renderer/`: The renderer process code, runs in the Chromium renderer
  process in the main world alongside the Slack frontend
- `Plugin.ts`: Types and the abstract class for Taut plugins, TypeScript ESM to
  be bundled by esbuild
