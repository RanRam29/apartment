---
tags: [db, mongodb, model, roommates]
collection: roommate_profiles
engine: MongoDB
orm: Mongoose
file: backend/src/models/mongo/RoommateProfile.js
---

# RoommateProfile

Lifestyle preferences for roommate matching.

## Fields

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `_id` | ObjectId | auto | |
| `userId` | String (unique) | — | References [[User]].id |
| `lookingForRoommate` | Boolean | `false` | Active flag |
| `sleepSchedule` | String | `flexible` | `early_bird`/`night_owl`/`flexible` |
| `cleanlinessLevel` | Number | `3` | 1-5 scale |
| `noiseLevel` | String | `moderate` | `quiet`/`moderate`/`lively` |
| `guestsFrequency` | String | `rarely` | `never`/`rarely`/`sometimes`/`often` |
| `smokingAllowed` | Boolean | `false` | |
| `petsAllowed` | Boolean | `false` | |
| `workFromHome` | Boolean | `false` | |
| `cities` | [String] | `[]` | Preferred cities |
| `firstName` | String | `''` | Display snapshot |
| `lastName` | String | `''` | Display snapshot |
| `avatarUrl` | String | `null` | Display snapshot |
