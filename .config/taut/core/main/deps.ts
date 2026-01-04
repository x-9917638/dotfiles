// Taut Main Process Dependencies
// NPM dependencies bundled into deps/ by Bun for use in the main process
// Provides esbuild (WASM), jsonc-parser, and React DevTools installer

import * as esbuild from 'esbuild-wasm/lib/browser.js'
import * as jsonc from 'jsonc-parser/lib/esm/main.js'
import resolve from 'resolve'
import path from 'node:path'
import fs from 'node:fs'
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer'

const defaultLoader: Record<string, esbuild.Loader | undefined> = {
  '.ts': 'ts',
  '.mts': 'ts',
  '.cts': 'ts',
  '.js': 'js',
  '.mjs': 'js',
  '.cjs': 'js',
  '.tsx': 'tsx',
  '.jsx': 'jsx',
  '.json': 'json',
  '.txt': 'text',
}

/**
 * Initialize esbuild-wasm with the given wasm file path
 * @param wasmPath - path to the esbuild.wasm file
 */
export async function initEsbuild(wasmPath: string) {
  const wasmFile = await fs.promises.readFile(wasmPath)
  await esbuild.initialize({
    wasmModule: new WebAssembly.Module(new Uint8Array(wasmFile)),
    worker: false,
  })
}

/**
 * Bundle an entry file and return an IIFE expression
 * Uses esbuild-wasm
 *
 * @param entryPath - path to the entry file (ts or js)
 * @returns the generated IIFE expression
 */
export async function bundle(entryPath: string): Promise<string> {
  const absEntry = path.resolve(entryPath)

  const result = await esbuild.build({
    entryPoints: [absEntry],
    bundle: true,
    format: 'iife',
    globalName: 'output',
    write: false,
    sourcemap: false,
    treeShaking: true,
    legalComments: 'none',
    platform: 'browser',
    plugins: [
      {
        name: 'load-plugin',
        setup(build) {
          build.onResolve({ filter: /.*/ }, async (args) => {
            const resolvedPath = await new Promise<string>((r, reject) => {
              resolve(
                args.path,
                {
                  basedir: args.resolveDir,
                  extensions: Object.keys(defaultLoader),
                  includeCoreModules: false,
                  preserveSymlinks: false,
                },
                (err, res) => {
                  if (err) {
                    return reject(err)
                  }
                  if (!res) {
                    return reject(
                      new Error(`Could not resolve module: ${args.path}`)
                    )
                  }
                  r(res)
                }
              )
            })
            return { path: resolvedPath }
          })

          build.onLoad({ filter: /.*/ }, async (args) => {
            const contents = await fs.promises.readFile(args.path, 'utf-8')
            return {
              contents,
              loader: defaultLoader[path.extname(args.path)] || 'text',
            }
          })
        },
      },
    ],
  })

  if (!result.outputFiles || result.outputFiles.length === 0) {
    throw new Error('no output produced')
  }

  const code = result.outputFiles[0].text
    .replace(/^(["']use strict["'];?\n?)?var output = /, '')
    .replace(/;?\s*$/, '')
    .trim()

  return code
}

export async function stopEsbuild() {
  await esbuild.stop()
}

export function parseJSONC(text: string): any {
  return jsonc.parse(text, undefined, {
    allowTrailingComma: true,
  })
}

// In the future, we could consider including the extension
// in the installer so it doesn't install on first run
export async function installReactDevtools() {
  await installExtension(REACT_DEVELOPER_TOOLS)
}
