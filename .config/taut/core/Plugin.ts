// Taut Plugin Base Class
// Abstract class and types that all Taut plugins must extend
// Defines the TautAPI interface available to plugins

import type { TautPluginConfig } from './main/plugins.cjs'
export type { TautPluginConfig } from './main/plugins.cjs'
import type { TautAPI } from './renderer/client'
export type { TautAPI } from './renderer/client'
export type { ComponentType, componentReplacer } from './renderer/react'

/**
 * Abstract base class that all Taut plugins must extend.
 * Plugins are instantiated in the browser context with access to the TautAPI.
 */
export abstract class TautPlugin {
  /** The display name of the plugin. */
  abstract name: string
  /** A short description of the plugin in mrkdwn format. */
  abstract description: string
  /** The authors of the plugin in mrkdwn format, using <@user_id> syntax. */
  abstract authors: string

  /**
   * @param api - The TautAPI instance for plugin communication
   * @param config - The plugin's configuration from config.jsonc
   */
  constructor(
    protected api: TautAPI,
    protected config: TautPluginConfig
  ) {}

  /**
   * Called when the plugin should start.
   * Subclasses must implement this method.
   */
  abstract start(): void

  /**
   * Called when the plugin should stop and clean up.
   * Subclasses should override this to perform cleanup.
   */
  stop(): void {
    // Default implementation does nothing
  }

  /**
   * Log a message with the plugin's name prefix.
   * @param args - Something to log
   */
  protected log = this._log.bind(this)
  protected _log(...args: any[]) {
    console.log(`[Taut] [${this.constructor.name}]`, ...args)
  }
}

export default TautPlugin
export type TautPluginConstructor = new (
  api: TautAPI,
  config: object
) => TautPlugin
