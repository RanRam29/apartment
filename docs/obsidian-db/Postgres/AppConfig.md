---
tags: [db, postgres, model, config]
table: app_config
engine: PostgreSQL
orm: Sequelize
file: backend/src/models/pg/AppConfig.js
---

# AppConfig

Simple key-value configuration store. Runtime settings without redeploy.

## Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `key` | STRING(100) | PK | Config key name |
| `value` | STRING(500) | Yes | Config value |
| `description` | TEXT | No | Human-readable description |
