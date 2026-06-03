---
tags: [db, redis, cache]
engine: Redis
---

# Redis Cache Patterns

Redis is used as a transient cache with an in-memory Map fallback if Redis is unavailable.

## Cache Keys

| Key Pattern | Content | TTL | Source |
|------------|---------|-----|--------|
| `feed:{city}` | Apartment feed listings by city | 300-600s | [[Apartment]] query |
| `apartment:{id}` | Single apartment details | 600s | [[Apartment]] by ID |
| `landlord:dashboard:{landlordId}` | Landlord dashboard aggregation | 180s | Dashboard endpoint |
| `matches:tenant:{tenantId}` | Tenant's matches list | 60s | [[Match]] query |
| `matches:landlord:{landlordId}` | Landlord's matches list | 60s | [[Match]] query |
| `user:{userId}` | User profile (id, email, name, avatar, role) | — | [[User]] on login |
| `email:verify:{token}` | Maps token -> userId | Transient | [[User]] verification |
| `push:token:{userId}` | Push notification device token | — | Mobile registration |
| `recommendations:{userId}:{filters}` | Filtered apartment recommendations | 300s | Feed + [[UserPreferences]] |

## Operations

- `get(key)` / `setex(key, ttl, json)` — Standard read/write with TTL
- `del(key)` — Cache invalidation on data change
- `incr(key)` / `decr(key)` — Atomic counters
- `expireat(key, timestamp)` — Set specific expiration

## Fallback

When Redis is unavailable (test mode / connection failure), an in-memory `Map` provides the same interface with no persistence.
