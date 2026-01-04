// Taut Plugin Manager
// Handles plugin discovery, bundling, config watching, and hot-reloading
// Communicates with the renderer process via IPC

const { promises: fs, watchFile, watch } = require('fs')
const path = require('path')
const electron = require('electron')

const {
  PATHS,
  deepEqual,
  fileExists,
  esbuildInitialized,
} = require('./helpers.cjs')

/** @type {typeof import('./deps.js')} */
const deps = require('./deps/deps.bundle.js')
const { bundle, parseJSONC } = deps

const { BROWSER } = require('./patch.cjs')

/** Supported plugin file extensions */
const PLUGIN_EXTENSIONS = [
  '.js',
  '.cjs',
  '.mjs',
  '.jsx',
  '.ts',
  '.cts',
  '.mts',
  '.tsx',
]

/**
 * @typedef {{ enabled: boolean } & Record<string, unknown>} TautPluginConfig
 */
/**
 * @typedef {Object} TautConfig
 * @property {Record<string, TautPluginConfig | undefined>} plugins
 */

/** @type {TautConfig} */
let config = { plugins: {} }

/**
 * Read the config file, or return default config if it doesn't exist
 * @returns {Promise<TautConfig>}
 */
async function readConfig() {
  try {
    if (await fileExists(PATHS.config)) {
      const contents = await fs.readFile(PATHS.config, 'utf8')
      return parseJSONC(contents)
    }
  } catch (err) {
    console.error('[Taut] Failed to read config:', err)
  }
  return { plugins: {} }
}

/**
 * Bundle a plugin file and send it to the renderer process
 * @param {string} filePath - Absolute path to the plugin file
 * @returns {Promise<void>}
 */
async function bundleAndSendPlugin(filePath) {
  const name = getPluginName(filePath)
  const pluginConfig = config.plugins[name] || { enabled: false }

  try {
    await esbuildInitialized
    const iife = await bundle(filePath)

    const code = `globalThis.__tautPluginManager.loadPlugin(${JSON.stringify(
      name
    )}, ${iife}.default, ${JSON.stringify(pluginConfig)})`
    if (!BROWSER.current) {
      throw new Error('Browser window not initialized')
    }
    await BROWSER.current.webContents.executeJavaScript(code)
    console.log(`[Taut] Plugin ${name} sent successfully`)
  } catch (err) {
    console.error(`[Taut] Failed to bundle plugin ${name}:`, err)
  }
}

/**
 * Check if a file has a valid plugin extension
 * @param {string} filename
 * @returns {boolean}
 */
function isValidPluginFile(filename) {
  const ext = path.extname(filename)
  return PLUGIN_EXTENSIONS.includes(ext)
}

/**
 * Start watching config file for changes
 */
function watchConfig() {
  console.log('[Taut] Watching config file:', PATHS.config)
  watchFile(PATHS.config, async () => {
    console.log('[Taut] Config file changed')
    const newConfig = await readConfig()
    const oldPluginConfigs = config.plugins || {}
    const newPluginConfigs = newConfig.plugins || {}

    // Check each plugin to see if its config changed
    const allPluginNames = new Set([
      ...Object.keys(oldPluginConfigs),
      ...Object.keys(newPluginConfigs),
    ])

    for (const name of allPluginNames) {
      const oldPluginConfig = oldPluginConfigs[name] || { enabled: false }
      const newPluginConfig = newPluginConfigs[name] || { enabled: false }

      if (!deepEqual(oldPluginConfig, newPluginConfig)) {
        console.log(`[Taut] Config changed for plugin: ${name}`)
        if (BROWSER.current) {
          BROWSER.current.webContents.send(
            'taut:config-changed',
            name,
            newPluginConfig
          )
        }
      }
    }

    config = newConfig
  })
}

/**
 * Read the user.css file
 * @returns {Promise<string>} The user.css contents, or empty string if not found
 */
async function readUserCss() {
  try {
    if (await fileExists(PATHS.userCss)) {
      return await fs.readFile(PATHS.userCss, 'utf8')
    }
  } catch (err) {
    console.error('[Taut] Failed to read user.css:', err)
  }
  return ''
}

/**
 * Send user.css to the renderer
 */
async function sendUserCss() {
  const css = await readUserCss()
  if (BROWSER.current) {
    console.log('[Taut] Sending user.css')
    BROWSER.current.webContents.send('taut:user-css-changed', css)
  }
}

/**
 * Start watching user.css file for changes
 */
function watchUserCss() {
  console.log('[Taut] Watching user.css file:', PATHS.userCss)
  watchFile(PATHS.userCss, async () => {
    console.log('[Taut] user.css file changed')
    await sendUserCss()
  })
}

/**
 * Start watching a plugin directory for new/updated files
 * @param {string} dir - Directory to watch
 */
async function watchPluginDir(dir) {
  try {
    if (!(await fileExists(dir))) {
      console.log(`[Taut] Plugin directory does not exist, creating: ${dir}`)
      await fs.mkdir(dir, { recursive: true })
    }

    console.log('[Taut] Watching plugin directory:', dir)
    watch(dir, async (eventType, filename) => {
      if (!filename || !isValidPluginFile(filename)) return

      const filePath = path.join(dir, filename)
      console.log(`[Taut] Plugin file ${eventType}: ${filename}`)

      await handlePluginFileChange(filePath)
    })
  } catch (err) {
    console.error(`[Taut] Failed to watch plugin dir ${dir}:`, err)
  }
}

/**
 * Scan directories and generate a map of active plugins
 * Prioritizes user plugins over core plugins
 * Prioritizes extensions based on PLUGIN_EXTENSIONS order
 * @returns {Promise<Map<string, string>>} Map of plugin name -> absolute file path
 */
async function getPluginMap() {
  const pluginMap = new Map()

  // Helper to process a directory
  /**
   * @param {string} dir
   */
  const processDir = async (dir) => {
    if (!(await fileExists(dir))) return

    const files = await fs.readdir(dir)
    const pluginsInDir = new Map() // name -> { extIndex, path }

    for (const file of files) {
      const ext = path.extname(file)
      const extIndex = PLUGIN_EXTENSIONS.indexOf(ext)
      if (extIndex === -1) continue

      const name = path.basename(file, ext)
      const filePath = path.resolve(dir, file)

      // If we haven't seen this plugin in this dir yet, or if this file has higher priority extension
      // (lower index) than what we've seen, store it
      if (
        !pluginsInDir.has(name) ||
        pluginsInDir.get(name).extIndex > extIndex
      ) {
        pluginsInDir.set(name, { extIndex, path: filePath })
      }
    }

    // Add to main map
    for (const [name, info] of pluginsInDir) {
      pluginMap.set(name, info.path)
    }
  }

  // Process core first, then user (so user overrides)
  await processDir(PATHS.plugins)
  await processDir(PATHS.userPlugins)

  return pluginMap
}

/**
 * Handle file changes in plugin directories
 * @param {string} changedFilePath - Absolute path to the changed file
 */
async function handlePluginFileChange(changedFilePath) {
  const oldPluginMap = currentPluginMap
  const newPluginMap = await getPluginMap()
  currentPluginMap = newPluginMap

  /** @type {Set<string>} */
  const pluginsToLoad = new Set()

  // If the changed file is the active version, load it
  const changedName = getPluginName(changedFilePath)
  const activePath = newPluginMap.get(changedName)
  if (activePath === changedFilePath) {
    pluginsToLoad.add(activePath)
  } else {
    console.log(
      `[Taut] Changed file ${changedFilePath} is not the active version for plugin ${changedName}, skipping load`
    )
  }

  // Any other differences
  for (const [name, newPath] of newPluginMap) {
    const oldPath = oldPluginMap.get(name)
    if (oldPath !== newPath) {
      pluginsToLoad.add(newPath)
      console.log(
        `[Taut] Plugin resolution changed for ${name}: ${oldPath} -> ${newPath}`
      )
    }
  }

  // Bundle and send all affected plugins
  for (const filePath of pluginsToLoad) {
    await bundleAndSendPlugin(filePath)
  }
}

/** @type {Map<string, string>} */
let currentPluginMap = new Map()

/**
 * Get plugin name from file path
 * @param {string} filePath
 * @returns {string}
 */
function getPluginName(filePath) {
  return path.basename(filePath, path.extname(filePath))
}

// IPC Handler: Start plugins (scans, compiles, sends to renderer)
electron.ipcMain.handle('taut:start-plugins', async () => {
  console.log('[Taut] Starting plugins')
  try {
    // Read and store config
    config = await readConfig()

    // Generate initial plugin map
    currentPluginMap = await getPluginMap()
    const pluginFiles = [...currentPluginMap.values()]

    console.log(
      `[Taut] Found ${pluginFiles.length} plugin files:`,
      pluginFiles,
      PATHS.plugins,
      PATHS.userPlugins
    )

    for (const filePath of pluginFiles) {
      await bundleAndSendPlugin(filePath)
    }

    // Start watching for changes
    watchConfig()
    watchUserCss()
    watchPluginDir(PATHS.plugins)
    watchPluginDir(PATHS.userPlugins)

    // Send initial user.css
    await sendUserCss()

    console.log(`[Taut] Started plugins`)
  } catch (err) {
    console.error('[Taut] Failed to get plugins:', err)
    return []
  }
})

electron.ipcMain.handle('taut:get-config-dir', async () => {
  return PATHS
})
