// Taut Main Process Patch
// Monkey-patches Electron APIs to inject custom behavior into Slack
// Sets up BrowserWindow proxy, CORS bypass, custom menu, and React DevTools

const { promises: fs, readFileSync } = require('fs')
const Module = require('module')
const electron = require('electron')

const { PATHS, fileExists, esbuildInitialized } = require('./helpers.cjs')

/** @type {typeof import('./deps.js')} */
const deps = require('./deps/deps.bundle.js')
const { bundle, installReactDevtools } = deps

/**
 * Hold the primary Slack BrowserWindow so we can inject scripts once ready
 * Needs to be an object so changes go through the export to other files
 * @type {{ current: electron.BrowserWindow | undefined }}
 */
let BROWSER = { current: undefined }

/**
 * Cache for the original Slack preload script contents
 * @type {string | null}
 */
let originalPreloadContents = null
// Handler: Get original preload contents (for preload.js)
electron.ipcMain.handle('taut:get-original-preload', () => {
  return originalPreloadContents
})

const proxiedBrowserWindow = new Proxy(electron.BrowserWindow, {
  /**
   * @param {typeof electron.BrowserWindow} target
   * @param {[Electron.BrowserWindowConstructorOptions]} arguments
   * @returns {electron.BrowserWindow}
   */
  construct(target, [options]) {
    console.log('[Taut] Constructing BrowserWindow')
    if (!options.webPreferences) {
      options.webPreferences = {}
    }
    options.webPreferences.devTools = true

    // Read and cache the original preload script contents
    const originalPreloadPath = options.webPreferences.preload || ''
    if (originalPreloadPath) {
      try {
        // Needs to be sync because we want to get this ready before giving control back to Slack
        originalPreloadContents = readFileSync(originalPreloadPath, 'utf8')
        console.log('[Taut] Cached original preload from:', originalPreloadPath)
      } catch (err) {
        console.error('[Taut] Failed to read original preload:', err)
        originalPreloadContents = null
      }
    }

    // Use our custom preload
    options.webPreferences.preload = PATHS.preloadJs

    const instance = new target(options)
    BROWSER.current = instance

    // Inject client.js on page load
    instance.webContents.on('did-finish-load', async () => {
      try {
        if (await fileExists(PATHS.renderJs)) {
          await esbuildInitialized
          const renderJs = await bundle(PATHS.renderJs)
          console.log('[Taut] Injecting client.js')
          await instance.webContents.executeJavaScript(renderJs)
        } else {
          console.error('[Taut] client.js not found at:', PATHS.renderJs)
        }
      } catch (err) {
        console.error('[Taut] Failed to inject client.js:', err)
      }
    })

    return instance
  },
})

/** @typedef {(request: string, parent: Module, isMain: boolean) => object} ModuleLoadFunction */
/** @type {ModuleLoadFunction} */
// @ts-ignore
const originalLoad = Module._load
/** @type {ModuleLoadFunction} */
// @ts-ignore
Module._load = function (request, parent, isMain) {
  // only intercept 'electron'
  const originalExports = originalLoad.apply(this, [request, parent, isMain])
  if (request === 'electron') {
    const newExports = new Proxy(originalExports, {
      get(target, prop, receiver) {
        if (prop === 'BrowserWindow') {
          return proxiedBrowserWindow
        }
        return Reflect.get(target, prop, receiver)
      },
    })
    return newExports
  }
  return originalExports
}

const whenReadyPromise = electron.app.whenReady()
const fakeWhenReadyPromise = (async () => {
  await whenReadyPromise

  // Allow all CORS requests by setting ACAO header to https://app.slack.com
  // Doesn't modifiy requests from iframes for security but also to not break them
  /**
   * Stores the origin for each request ID
   * @type {Map<number, {origin: string | null, requestedMethod: string | null, requestedHeaders: string | null}>}
   **/
  const requestMap = new Map()

  electron.session.defaultSession.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      const getHeader = (/** @type {string} */ headerName) => {
        const foundKey = Object.keys(details.requestHeaders).find(
          (key) => key.toLowerCase() === headerName.toLowerCase()
        )
        return foundKey ? details.requestHeaders[foundKey] : null
      }
      requestMap.set(details.id, {
        origin: getHeader('origin'),
        requestedMethod: getHeader('access-control-request-method'),
        requestedHeaders: getHeader('access-control-request-headers'),
      })
      // Clean up after 5 minutes to avoid memory leaks
      setTimeout(() => requestMap.delete(details.id), 5 * 60 * 1000)

      callback({})
    }
  )
  electron.session.defaultSession.webRequest.onHeadersReceived(
    (details, callback) => {
      const responseHeaders = details.responseHeaders || {}
      let shouldModify = false

      if (details.frame) {
        try {
          const frameOrigin = new URL(details.frame.url).origin
          if (frameOrigin === 'https://app.slack.com') {
            shouldModify = true
          }
        } catch {
          // Ignore URL parsing errors
        }
      }

      if (shouldModify) {
        const requestInfo = requestMap.get(details.id)
        requestMap.delete(details.id)

        // Remove existing headers (case-insensitive)
        const deleteHeader = (/** @type {string} */ headerName) => {
          Object.keys(responseHeaders).forEach((key) => {
            if (key.toLowerCase() === headerName.toLowerCase()) {
              delete responseHeaders[key]
            }
          })
        }
        deleteHeader('Access-Control-Allow-Origin')
        deleteHeader('Access-Control-Allow-Methods')
        deleteHeader('Access-Control-Allow-Headers')
        deleteHeader('Access-Control-Expose-Headers')
        deleteHeader('Vary')
        deleteHeader('X-Frame-Options')

        const responseHeaderNames = Object.keys(responseHeaders).join(', ')

        responseHeaders['Access-Control-Allow-Origin'] = [
          requestInfo?.origin ?? 'https://app.slack.com',
        ]
        if (requestInfo?.requestedMethod) {
          responseHeaders['Access-Control-Allow-Methods'] = [
            requestInfo.requestedMethod,
          ]
        }
        if (requestInfo?.requestedHeaders) {
          responseHeaders['Access-Control-Allow-Headers'] = [
            requestInfo.requestedHeaders,
          ]
        }
        responseHeaders['Access-Control-Expose-Headers'] = [responseHeaderNames]
        responseHeaders['Vary'] = ['Origin']
      }
      callback({ responseHeaders })
    }
  )

  // Install React DevTools
  try {
    await installReactDevtools()
    const extensions =
      electron.session.defaultSession.extensions.getAllExtensions()
    // https://github.com/electron/electron/issues/41613#issuecomment-2644018998
    for (const extension of extensions) {
      if (
        extension.manifest?.manifest_version === 3 &&
        extension.manifest?.background?.service_worker
      ) {
        await electron.session.defaultSession.serviceWorkers.startWorkerForScope(
          extension.url
        )
      }
    }
    console.log('[Taut] React Developer Tools installed')
  } catch (err) {
    console.error('[Taut] Failed to install React Developer Tools:', err)
  }
})()
electron.app.whenReady = async () => {
  console.log('[Taut] app.whenReady() called')
  await fakeWhenReadyPromise
}

/** @type {Electron.MenuItemConstructorOptions} */
const tautMenu = {
  label: 'Taut',
  submenu: [
    {
      label: 'About Taut',
      click: async () => {
        await electron.shell.openExternal('https://github.com/jeremy46231/taut')
      },
    },
    { type: 'separator' },
    {
      role: 'toggleDevTools',
      accelerator: 'CmdOrCtrl+Alt+I',
    },
    { role: 'reload' },
    { role: 'forceReload' },
    {
      label: 'Quit',
      role: 'quit',
    },
  ],
}
// Patch for Menu.setApplicationMenu to insert Taut menu
const originalSetApplicationMenu = electron.Menu.setApplicationMenu
electron.Menu.setApplicationMenu = function (menu) {
  if (menu == null) {
    return originalSetApplicationMenu.call(this, menu)
  }
  /** @type {(Electron.MenuItem | Electron.MenuItemConstructorOptions)[]} */
  const menuTemplate = [...menu.items]
  if (menuTemplate[menuTemplate.length - 1].role === 'help') {
    // Insert before Help menu
    menuTemplate.splice(menuTemplate.length - 1, 0, tautMenu)
  } else {
    // Append to end
    menuTemplate.push(tautMenu)
  }
  const newMenu = electron.Menu.buildFromTemplate(menuTemplate)
  return originalSetApplicationMenu.call(this, newMenu)
}

module.exports = {
  BROWSER,
}
