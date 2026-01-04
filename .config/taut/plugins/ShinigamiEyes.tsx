// Shows Hackatime trust level indicators next to user names in Slack

import { TautPlugin, type TautPluginConfig, type TautAPI } from '../core/Plugin'

const API_URL = 'https://hackatime.hackclub.com/api/admin/v1/execute'
const CACHE_KEY = 'shinigami_trust_levels'
const CACHE_TIMESTAMP_KEY = 'shinigami_trust_levels_timestamp'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

type trustLevel = 0 | 1 | 2 | 3 | 4
const TRUST_LEVEL_EMOJIS = new Map<trustLevel, string>([
  [0, '🔵'],
  [1, '🔴'],
  [2, '🟢'],
  [3, '🟡'],
  [4, '⚠️'],
])
const TRUST_LEVEL_COLORS = new Map<trustLevel, string>([
  [0, 'blue'],
  [1, 'red'],
  [2, 'green'],
  [3, 'yellow'],
])
const TRUST_LEVEL_COLORS_REVERSED = new Map<string, trustLevel>(
  [...TRUST_LEVEL_COLORS.entries()].map(([k, v]) => [v, k])
)

type ShinigamiConfig = TautPluginConfig & {
  apiToken?: string
  nameEmojis?: boolean
}

type AuditLog = {
  previousTrustLevel?: trustLevel
  newTrustLevel?: trustLevel
  date?: Date
  reason?: string
  changedByUsername?: string
  changedBySlackId?: string
}

export default class ShinigamiEyes extends TautPlugin {
  name = 'Shinigami Eyes'
  description =
    'Displays Hackatime trust level indicators next to user names in Slack'
  authors = '<@U07VC9705D4>, <@U046VA0KR8R>, <@U06UYA5GMB5>'

  config: ShinigamiConfig

  trustLevels: Record<string, trustLevel> = {}

  private unpatchBaseMessageSender = () => {}
  private unpatchMemberProfileHoverCard = () => {}

  constructor(api: TautAPI, config: TautPluginConfig) {
    super(api, config)
    this.config = config as ShinigamiConfig
  }

  start() {
    this.log('Starting')

    if (!this.config.apiToken) {
      this.log('Warning: No API token configured. Set apiToken in config.jsonc')
      return
    }

    this.initializeTrustLevels()

    const MrkdwnElement = this.api.findComponent<{
      text: string
    }>('MrkdwnElement')

    const instance = this

    // Only patch message sender to add trust level emoji if enabled in config
    if (this.config.nameEmojis !== false) {
      // Patch Message component to add trust level CSS classes
      this.unpatchBaseMessageSender = this.api.patchComponent<{
        botId?: string
        userId?: string
        className?: string
      }>('BaseMessageSender', (OriginalBaseMessageSender) => (props) => {
        const userId = props.userId
        const isBotMessage = !!props.botId

        const [trustLevel, setTrustLevel] = React.useState<trustLevel | null>(
          () => {
            if (!userId || isBotMessage) return null
            return instance.trustLevels[userId] ?? null
          }
        )

        React.useEffect(() => {
          if (!userId || isBotMessage) return

          // If we have a cached status, use it
          if (instance.trustLevels[userId] !== undefined) {
            if (trustLevel !== instance.trustLevels[userId]) {
              setTrustLevel(instance.trustLevels[userId])
            }
          }
        }, [userId, isBotMessage])

        const className =
          trustLevel !== null ? `taut-trust-level-${trustLevel}` : ''

        return (
          <OriginalBaseMessageSender
            {...props}
            className={
              props.className ? `${props.className} ${className}` : className
            }
          />
        )
      })
    } else {
      this.unpatchBaseMessageSender = () => {}
    }

    // Patch MemberProfileHoverCard to show trust level and audit logs
    this.unpatchMemberProfileHoverCard = this.api.patchComponent<{
      memberId: string
      header?: React.ReactNode
    }>(
      'MemberProfileHoverCard',
      (OriginalMemberProfileHoverCard) => (props) => {
        const memberId = props.memberId
        const trustLevel = instance.trustLevels[memberId]

        const [auditLogs, setAuditLogs] = React.useState<AuditLog[] | null>(
          null
        )
        const [isLoading, setIsLoading] = React.useState(false)

        // Fetch audit logs when hover card opens (for trust levels 1 and 3)
        React.useEffect(() => {
          if (trustLevel !== 1 && trustLevel !== 3) return

          let cancelled = false
          setIsLoading(true)

          instance.fetchAuditLogs(memberId).then((logs) => {
            if (!cancelled) {
              console.log('[Taut] Fetched audit logs:', logs)
              setAuditLogs(logs)
              setIsLoading(false)
            }
          })

          return () => {
            cancelled = true
          }
        }, [memberId, trustLevel])

        const emoji =
          trustLevel !== undefined ? TRUST_LEVEL_EMOJIS.get(trustLevel) : null
        const color = TRUST_LEVEL_COLORS.get(trustLevel)

        const customContent = (
          <div
            style={{
              padding: '8px',
              borderBottom:
                '1px solid rgba(var(--sk_foreground_low, #1d1c1d), .13)',
              color: 'var(--sk_primary_foreground, #1d1c1d)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--sk_primary_foreground, #1d1c1d)',
              }}
            >
              {emoji} Trust Level: {color ?? 'Unknown'}
            </div>

            {/* Show audit logs for trust levels 1 and 3 */}
            {(trustLevel === 1 || trustLevel === 3) && (
              <div style={{ marginTop: '8px' }}>
                {isLoading && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#616061',
                    }}
                  >
                    Loading audit log...
                  </div>
                )}

                {!isLoading && auditLogs && auditLogs.length > 0 && (
                  <div
                    style={{
                      fontSize: '11px',
                    }}
                  >
                    {auditLogs.map((log, index) => {
                      const prevEmoji =
                        log.previousTrustLevel !== undefined
                          ? TRUST_LEVEL_EMOJIS.get(log.previousTrustLevel) ||
                            '⚪'
                          : '⚪'
                      const newEmoji =
                        log.newTrustLevel !== undefined
                          ? TRUST_LEVEL_EMOJIS.get(log.newTrustLevel) || '⚪'
                          : '⚪'
                      const changedBy = log.changedBySlackId
                        ? `<@${log.changedBySlackId}>`
                        : log.changedByUsername || 'Unknown'
                      const date = log.date
                        ? log.date.toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Unknown date'
                      const reason = log.reason || ''

                      return (
                        <div
                          key={index}
                          style={{
                            padding: '4px 0',
                          }}
                        >
                          <MrkdwnElement
                            text={`${prevEmoji} → ${newEmoji} on _${date}_ by ${changedBy}${
                              reason ? `: ${reason}` : ''
                            }`}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}

                {!isLoading && (!auditLogs || auditLogs.length === 0) && (
                  <div
                    style={{
                      fontSize: '11px',
                    }}
                  >
                    No trust level changes found
                  </div>
                )}
              </div>
            )}
          </div>
        )

        // Merge with existing header if one exists
        const newHeader = (
          <>
            {props.header}
            {customContent}
          </>
        )

        return <OriginalMemberProfileHoverCard {...props} header={newHeader} />
      }
    )

    // Generate CSS for each trust level emoji
    const emojiStyles = [...TRUST_LEVEL_EMOJIS.entries()]
      .map(([level, emoji]) => {
        return `
        .taut-trust-level-${level}::before {
          content: "${emoji} ";
        }
      `
      })
      .join('\n')

    this.api.setStyle(
      'shinigami-eyes',
      `
        ${emojiStyles}
      `
    )

    this.log('Loaded successfully!')
  }

  stop() {
    this.unpatchBaseMessageSender()
    this.unpatchMemberProfileHoverCard()
    this.api.removeStyle('shinigami-eyes')

    this.log('Stopped')
  }

  // Cache Management

  isCacheValid(): boolean {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    if (!timestamp) return false

    const now = Date.now()
    const cacheTime = parseInt(timestamp, 10)
    return now - cacheTime < CACHE_DURATION
  }

  loadCachedTrustLevels(): boolean {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached && this.isCacheValid()) {
        this.trustLevels = JSON.parse(cached)
        this.log(
          'Loaded trust levels from cache:',
          Object.keys(this.trustLevels).length,
          'users'
        )
        return true
      }
    } catch (e) {
      this.log('Error loading cached trust levels:', e)
    }
    return false
  }

  saveTrustLevelsToCache(data: Record<string, trustLevel>) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
      this.log(
        'Saved trust levels to cache:',
        Object.keys(data).length,
        'users'
      )
    } catch (e) {
      this.log('Error saving trust levels to cache:', e)
    }
  }

  // API Fetching

  async fetchTrustLevelsFromAPI(): Promise<void> {
    const apiToken = this.config.apiToken
    if (!apiToken) {
      this.log('Cannot fetch trust levels: No API token configured')
      return
    }

    this.log('Fetching fresh trust levels from API...')
    const allUsers: Record<string, trustLevel> = {}

    try {
      // as of writing, there are over 17,000 users
      for (let start = 1; start <= 30_000; start += 1000) {
        const end = start + 999
        const query = `
          SELECT json_agg(json_build_object('id', slack_uid, 'trust_level', trust_level)) as users
          FROM users
          WHERE id BETWEEN ${start} AND ${end}
        `

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${apiToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ query }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        try {
          const usersData = data.rows?.[0]?.users?.[1]
          const users = usersData
            ? (JSON.parse(usersData) as {
                id: string
                trust_level: trustLevel
              }[])
            : []

          for (const user of users) {
            if (user.id) {
              allUsers[user.id] = user.trust_level
            }
          }
        } catch (parseError) {
          this.log(`Error parsing chunk ${start}-${end}:`, parseError)
        }

        this.log(
          `Processed chunk ${start}-${end}, total users: ${Object.keys(allUsers).length}`
        )

        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      this.log(
        'Successfully fetched trust levels:',
        Object.keys(allUsers).length,
        'users'
      )

      this.trustLevels = allUsers
      this.saveTrustLevelsToCache(allUsers)
    } catch (error) {
      this.log('Error fetching trust levels from API:', error)
    }
  }

  async initializeTrustLevels(): Promise<void> {
    if (!this.loadCachedTrustLevels()) {
      this.log('No valid cache found, fetching from API...')
      await this.fetchTrustLevelsFromAPI()
    }
  }

  getApiToken(): string | undefined {
    return this.config.apiToken
  }

  async fetchAuditLogs(slackId: string): Promise<AuditLog[] | null> {
    const apiToken = this.getApiToken()
    if (!apiToken) return null

    try {
      const userQuery = `SELECT id FROM users WHERE slack_uid = '${slackId}' LIMIT 1`

      const userResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${apiToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ query: userQuery }),
      })

      if (!userResponse.ok) {
        throw new Error(`Failed to fetch user: ${userResponse.status}`)
      }

      const userData = await userResponse.json()
      const userId = userData.rows?.[0]?.id?.[1]

      if (typeof userId !== 'number') {
        return null
      }

      const logsQuery = `
        SELECT 
          tl.id,
          tl.previous_trust_level,
          tl.new_trust_level,
          tl.reason,
          tl.notes,
          tl.created_at,
          u.username as changed_by_username,
          u.slack_uid as changed_by_slack_id
        FROM trust_level_audit_logs tl
        JOIN users u ON tl.changed_by_id = u.id
        WHERE tl.user_id = ${userId}
        ORDER BY tl.created_at DESC
        LIMIT 5
      `

      const logsResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${apiToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ query: logsQuery }),
      })

      if (!logsResponse.ok) {
        throw new Error(`Failed to fetch logs: ${logsResponse.status}`)
      }

      const rawData = await logsResponse.json()
      const auditLogs: AuditLog[] = ((rawData?.rows as any[]) ?? []).map(
        (row) => ({
          previousTrustLevel: row.previous_trust_level?.[1]
            ? TRUST_LEVEL_COLORS_REVERSED.get(row.previous_trust_level[1])
            : undefined,
          newTrustLevel: row.new_trust_level?.[1]
            ? TRUST_LEVEL_COLORS_REVERSED.get(row.new_trust_level[1])
            : undefined,
          date: row.created_at?.[1] ? new Date(row.created_at[1]) : undefined,
          reason: row.reason?.[1],
          changedByUsername: row.changed_by_username?.[1],
          changedBySlackId: row.changed_by_slack_id?.[1],
        })
      )

      return auditLogs
    } catch (error) {
      console.error('[Taut] [ShinigamiEyes] Error fetching audit logs:', error)
      return null
    }
  }
}
