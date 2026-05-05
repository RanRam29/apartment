# AGENTS.md

## Cursor Cloud specific instructions

### Overview

DirApp is a Tinder-style apartment rental matching platform for Israel. See `README.md` for full architecture, API reference, and stack details.

### Services

| Service | Port | How to start |
|---------|------|--------------|
| Backend (Node.js/Express) | 3000 | `cd backend && npm run dev` |
| AI Service (Python/FastAPI) | 8000 | `cd ai-service && source .venv/bin/activate && uvicorn app:app --reload --port 8000` |
| PostgreSQL | 5432 | `docker compose up -d postgres` |
| MongoDB | 27017 | `docker compose up -d mongodb` |
| Redis | 6379 | `docker compose up -d redis` |
| Kafka (optional) | 29092 | `docker compose up -d kafka` — backend runs without it |

### Key caveats

- **Node.js**: Use Node 20 via nvm (`source /home/ubuntu/.nvm/nvm.sh && nvm use 20`). The nvm setup is in `~/.bashrc`.
- **Backend .env**: The `.env` file must set `POSTGRES_SSL=false` for local dev (Docker Postgres does not support SSL). The `.env.example` defaults target Docker network hostnames; for local development outside Docker, change hostnames to `localhost`.
- **Backend tests**: Run with `--forceExit` flag and `POSTGRES_SSL=false` env to avoid SSL errors and Jest hanging: `POSTGRES_SSL=false npm test -- --forceExit`
- **AI service venv**: Dependencies are installed in `ai-service/.venv`. The `motor` package requires `pymongo<4.8` for compatibility — `pip install 'pymongo>=4.6,<4.8'` if you hit an import error about `_QUERY_OPTIONS`.
- **Kafka is optional**: The backend catches Kafka connection errors gracefully and continues without event streaming.
- **External APIs**: Gemini, Cloudinary, and Meshulam API keys are placeholders in dev. Features that depend on them (NLP search, image upload, payments) will fail without real keys, but the core app (auth, apartments CRUD, swipe, matching, chat) works without them.
- **Mobile app**: The React Native (Expo) mobile app is the only frontend client. It cannot be tested in a headless cloud VM; it requires Expo Go on a physical device or emulator.
