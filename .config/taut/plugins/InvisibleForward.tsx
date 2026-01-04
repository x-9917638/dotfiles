// Makes Slack links at the start of your messages invisible

import { TautPlugin, type TautPluginConfig, type TautAPI } from '../core/Plugin'

export default class InvisibleForward extends TautPlugin {
  name = 'Invisible Forward'
  description =
    "Makes Slack links at the start of your messages invisible, like a forwarded message, based on <@U07FXPUDYDC><https://greasyfork.org/en/scripts/526439-forward-slack-messages-files-and-later-items-to-channels-and-threads-using-an-invisible-link|'s userscript>"
  authors = '<@U06UYA5GMB5>'

  unpatchMessagePaneInput = () => {}
  unpatchInputContainer = () => {}
  unpatchBaseEditMessage = () => {}

  start() {
    this.log('Started')

    this.unpatchMessagePaneInput = this.api.patchComponent<{
      prepareAndSendMessage: (options: {
        /** Contains the message data */
        delta: Delta
      }) => Promise<unknown>
    }>('MessagePaneInput', (OriginalMessagePaneInput) => (props) => {
      const patchedPrepareAndSendMessage = React.useCallback(
        async (options: { delta: Delta }) => {
          const transformedDelta = this.transformInvisibleLinks(options.delta)
          return props.prepareAndSendMessage({
            ...options,
            delta: transformedDelta,
          })
        },
        [props.prepareAndSendMessage]
      )
      return (
        <OriginalMessagePaneInput
          {...props}
          prepareAndSendMessage={patchedPrepareAndSendMessage}
        />
      )
    })
    this.unpatchInputContainer = this.api.patchComponent<{
      prepareAndSendMessage: (options: {
        /** Contains the message data */
        delta: Delta
      }) => Promise<unknown>
    }>('InputContainer', (OriginalInputContainer) => (props) => {
      const patchedPrepareAndSendMessage = React.useCallback(
        async (options: { delta: Delta }) => {
          const transformedDelta = this.transformInvisibleLinks(options.delta)
          return props.prepareAndSendMessage({
            ...options,
            delta: transformedDelta,
          })
        },
        [props.prepareAndSendMessage]
      )
      return (
        <OriginalInputContainer
          {...props}
          prepareAndSendMessage={patchedPrepareAndSendMessage}
        />
      )
    })
    this.unpatchBaseEditMessage = this.api.patchComponent<{
      prepareAndSaveEditMessage: (options: {
        /** Contains the message data */
        delta: Delta
      }) => Promise<unknown>
    }>('BaseEditMessage', (OriginalBaseEditMessage) => (props) => {
      const patchedPrepareAndSaveEditMessage = React.useCallback(
        async (options: { delta: Delta }) => {
          const transformedDelta = this.transformInvisibleLinks(options.delta)
          return props.prepareAndSaveEditMessage({
            ...options,
            delta: transformedDelta,
          })
        },
        [props.prepareAndSaveEditMessage]
      )
      return (
        <OriginalBaseEditMessage
          {...props}
          prepareAndSaveEditMessage={patchedPrepareAndSaveEditMessage}
        />
      )
    })
  }

  stop() {
    this.unpatchMessagePaneInput()
    this.unpatchInputContainer()
    this.unpatchBaseEditMessage()
    this.log('Stopped')
  }

  /**
   * Scans the Delta for leading Slack URLs, replaces them with invisible characters,
   * and trims surrounding whitespace.
   */
  protected transformInvisibleLinks(delta: Delta): Delta {
    const ops = delta.ops
    const hiddenLinks: string[] = []
    let i = 0

    // Iterate through ops to find leading Slack links
    for (; i < ops.length; i++) {
      const op = ops[i]

      // If op is not text, break immediately
      if ('insert' in op && typeof op.insert !== 'string') {
        break
      }

      // Link
      if (op.attributes && op.attributes.link) {
        const url = op.attributes.link
        if (
          // Must be a Slack URL and the display text must match the URL
          (this.isSlackUrl(url) && 'insert' in op && op.insert === url) ||
          // A single dot is also hidden, even if not a Slack URL
          ('insert' in op && op.insert === '.')
        ) {
          hiddenLinks.push(url)
          continue
        }
        // Not a link to convert, stop processing
        break
      }

      // Whitespace
      // Consume whitespace if it appears between links or after the last link
      if (
        !op.attributes &&
        'insert' in op &&
        typeof op.insert === 'string' &&
        op.insert.trim() === ''
      ) {
        continue
      }

      // Normal, stop processing
      break
    }

    // If no links were found to hide, return original delta (optimization)
    if (hiddenLinks.length === 0) return delta

    const newOps: Delta['ops'] = []
    hiddenLinks.forEach((link) => {
      newOps.push({
        insert: '\u2060',
        attributes: { link },
      })
    })

    // Handle the remaining content
    if (i < ops.length) {
      // Special handling for the op where we stopped: trim the leading whitespace
      const currentOp = ops[i]
      if ('insert' in currentOp && typeof currentOp.insert === 'string') {
        const trimmedText = currentOp.insert.trimStart()

        if (trimmedText.length > 0) {
          newOps.push({
            ...currentOp,
            insert: trimmedText,
          })
        }
      } else {
        newOps.push(currentOp)
      }

      // Append the rest of the ops
      if (i + 1 < ops.length) {
        newOps.push(...ops.slice(i + 1))
      }
    }

    return { ops: newOps }
  }

  protected isSlackUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.hostname === 'app.slack.com') return true
      if (parsedUrl.hostname === 'files.slack.com') return true
      if (
        parsedUrl.hostname === 'slack.com' ||
        parsedUrl.hostname.endsWith('.slack.com')
      ) {
        if (parsedUrl.pathname.startsWith('/archives/')) return true
        if (parsedUrl.pathname.startsWith('/files/')) return true
        if (parsedUrl.pathname.startsWith('/docs/')) return true
        if (parsedUrl.pathname.startsWith('/team/')) return true
        if (parsedUrl.pathname.startsWith('/shortcuts/')) return true
        if (parsedUrl.pathname.startsWith('/huddle/')) return true
      }
    } catch {}
    return false
  }
}

/**
 * A Delta class, from Quill Delta, @see https://github.com/slab/delta
 * The Deltas we see are document Deltas, which only use the 'insert' operation
 */
type Delta = {
  ops: ((
    | {
        insert?: string | object
      }
    | {
        delete?: number
      }
    | {
        retain?: number
      }
  ) & {
    attributes?: Record<string, any>
  })[]
}
