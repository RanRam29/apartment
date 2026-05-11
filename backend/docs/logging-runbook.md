# Logging Runbook

## Streams
- Audit logs are stored in PostgreSQL table `audit_logs`.
- System events are stored in MongoDB collection `system_events`.

## Key filters for incident response
- Trace by request ID (`request_id` / `requestId`) across both streams.
- Filter audit by `actor_id`, `action`, `resource_type`, `outcome`.
- Filter system events by `severity`, `category`, `event`.

## Retention
- Audit retention cleanup runs every `AUDIT_RETENTION_CLEANUP_HOURS` (default `24`).
- Audit data retention horizon is `AUDIT_RETENTION_DAYS` (default `180`).
- System events use Mongo TTL by `SYSTEM_EVENT_RETENTION_DAYS` (default `30`).

## Health checks
- Verify API: `GET /health`.
- Verify admin API access: `GET /api/admin/logs/audit` with admin token.
- Verify event flow by checking recent `server.started` and auth audit events after login.
