// Taut Preload Script (The Bridge)
// Injected into the renderer process as a custom preload script by main.cjs
// Exposes TautBridge to the renderer and loads the original Slack preload

const { contextBridge, ipcRenderer } = require('electron')
/** @import { TautPluginConfig } from '../Plugin' */

console.log('[Taut] Preload loaded')

/** @typedef {typeof TautBridge} TautBridge */

// user.css style element management
const TAUT_USER_CSS_ID = 'taut-user-css-style'

/** @type {string} */
let currentUserCss = ''

/**
 * Get or create the user.css style element
 * @returns {HTMLStyleElement}
 */
function getOrCreateUserCssStyle() {
  let style = document.getElementById(TAUT_USER_CSS_ID)
  if (!style) {
    style = document.createElement('style')
    style.id = TAUT_USER_CSS_ID
    style.textContent = currentUserCss
    document.head.appendChild(style)
    console.log('[Taut] Created user.css style element')
  }
  return /** @type {HTMLStyleElement} */ (style)
}

/**
 * Ensure the user.css style element exists and has correct content
 */
function ensureUserCssStyle() {
  const style = getOrCreateUserCssStyle()
  if (style.textContent !== currentUserCss) {
    style.textContent = currentUserCss
  }
}

/**
 * Update the user.css content
 * @param {string} css - The new CSS content
 */
function updateUserCss(css) {
  currentUserCss = css

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        ensureUserCssStyle()
      },
      { once: true }
    )
  } else {
    ensureUserCssStyle()
  }
}

// Listen for user.css changes from main process
ipcRenderer.on('taut:user-css-changed', (event, css) => {
  console.log('[Taut] Received user.css update')
  updateUserCss(css)
})

// Expose TautBridge to the renderer world
const TautBridge = {
  /**
   * Ask the main process to start sending plugins and configs
   * @returns {Promise<void>}
   */
  startPlugins: () => ipcRenderer.invoke('taut:start-plugins'),

  /**
   * Subscribe to config changes with a callback
   * @param {(name: string, newConfig: TautPluginConfig) => void} callback - Callback to invoke on config changes
   */
  onConfigChange: (callback) => {
    ipcRenderer.on(
      'taut:config-changed',
      /**
       * @param {Electron.IpcRendererEvent} event
       * @param {string} name - Plugin name
       * @param {TautPluginConfig} newConfig - New plugin configuration
       */
      (event, name, newConfig) => {
        callback(name, newConfig)
      }
    )
  },

  /**
   * Get paths to the config directory and files within it
   * @returns {Promise<import('../main/helpers.cjs')['PATHS']>} - The paths object
   */
  getConfigPaths: () => ipcRenderer.invoke('taut:get-config-dir'),
}
contextBridge.exposeInMainWorld('TautBridge', TautBridge)

// Request and eval the original Slack preload script from the main process
;(async () => {
  try {
    const originalPreload = await ipcRenderer.invoke(
      'taut:get-original-preload'
    )
    if (originalPreload) {
      console.log('[Taut] Evaluating original Slack preload script')
      eval(originalPreload)
    }
  } catch (err) {
    console.error('[Taut] Failed to load original preload:', err)
  }
})()
