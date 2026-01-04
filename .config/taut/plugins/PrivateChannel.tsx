// Shows the ID of private channels

import { TautPlugin, type TautPluginConfig, type TautAPI } from '../core/Plugin'

export default class PrivateChannel extends TautPlugin {
  name = 'Private Channel ID'
  description = 'Shows the ID of private channels'
  authors = '<@U06UYA5GMB5>'

  unpatchBaseMrkdwnChannel = () => {}

  start() {
    this.log('Started')

    const SvgIcon = this.api.findComponent<{
      inline: boolean
      name: string
    }>('SvgIcon')

    this.unpatchBaseMrkdwnChannel = this.api.patchComponent<{
      isNonExistent: boolean
      id: string
    }>('BaseMrkdwnChannel', (OriginalBaseMrkdwnChannel) => (props) => {
      if (props.isNonExistent) {
        return (
          <span className="c-missing_channel--private">
            <SvgIcon inline={true} name="lock" /> {props.id}
          </span>
        )
      }
      return <OriginalBaseMrkdwnChannel {...props} />
    })
  }

  stop() {
    this.unpatchBaseMrkdwnChannel()
    this.log('Stopped')
  }
}
