# Automations reference

End-user oriented summary of the automation system. Normative behavior lives in [automations.md](./automations.md) and OpenAPI schemas `Automation*`.

## Example: invoke agent on mention

```json
{
  "name": "Triage when @oncall mentioned",
  "enabled": true,
  "trigger": {
    "type": "message.created",
    "channel_ids": ["ch_alerts"],
    "filter": { "body_contains": "@oncall" }
  },
  "actions": [
    {
      "type": "invoke_agent",
      "config": {
        "agent_id": "agt_oncall",
        "input_template": "{{event.data.body.text}}"
      }
    }
  ]
}
```

## Example: digest schedule

```json
{
  "name": "Daily standup digest",
  "trigger": {
    "type": "schedule.cron",
    "cron": "0 9 * * 1-5",
    "filter": { "timezone": "America/New_York" }
  },
  "actions": [
    {
      "type": "invoke_agent",
      "config": {
        "agent_id": "agt_digest",
        "input_template": "Summarize #engineering since yesterday"
      }
    },
    {
      "type": "post_message",
      "config": {
        "channel_id": "ch_leadership",
        "body_template": "{{actions[0].output.text}}"
      }
    }
  ]
}
```

See [triggers-actions.md](./triggers-actions.md) for action config keys.
