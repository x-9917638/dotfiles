// Taut Main Process Entrypoint
// Imports other modules to set up Electron patches and plugin management
// Loaded by the app.asar shim patched into Slack

console.log('[Taut] Starting Taut')

// @ts-ignore - needed for deps.bundle.js to load
globalThis.self = globalThis

// Load Electron patches (BrowserWindow proxy, CORS bypass, menu, React DevTools)
require('./patch.cjs')

// Load plugin manager (discovery, bundling, config watching, IPC handlers)
require('./plugins.cjs')
