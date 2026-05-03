# DirApp — Israeli Apartment Rental Matching Platform

A Tinder-style apartment rental platform for Israel. Swipe on apartments, get matched with landlords, chat in real-time, and search using natural language powered by Gemini AI.

---

## Architecture

```
Mobile (React Native / Expo)
         ↓ REST + WebSocket
Backend (Node.js / Express)  ←→  Redis (cache)
         ↓              ↓
   PostgreSQL        MongoDB
         ↓
   AI Service (Python / FastAPI)  ←→  Gemini API
         ↓
   Cloudinary (images)  +  Meshulam (payments)
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo 51), Zustand, React Query, Reanimated 3 |
| Backend | Node.js, Express, Sequelize, Mongoose, Socket.io |
| Databases | PostgreSQL (users/apartments/matches), MongoDB (chat/preferences) |
| Cache | Redis (feed cache, session, NLP query cache) |
| AI | Python FastAPI, Gemini 1.5 Flash (free tier), scikit-learn |
| Messaging | Apache Kafka |
| Images | Cloudinary (unsigned upload) |
| Payments | Meshulam (Israeli payment gateway) |
| Infrastructure | Docker Compose (dev), Kubernetes (prod) |

---

## Quick Start (Development)

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- Python 3.12+
- Expo CLI (`npm i -g expo-cli`)

### 1. Clone & configure

```bash
git clone https://github.com/ranram29/apartment-.git
cd apartment-

cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
# Fill in GEMINI_API_KEY, Cloudinary, Meshulam keys
```

### 2. Start infrastructure

```bash
docker compose up -d postgres mongodb redis kafka
```

### 3. Start backend

```bash
cd backend
npm install
npm run dev
# API running at http://localhost:3000
```

### 4. Start AI service

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### 5. Start mobile app

```bash
cd mobile
npm install
npx expo start
# Scan QR with Expo Go app
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (tenant or landlord) |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/apartments/feed` | Swipe feed (Redis cached) |
| POST | `/api/swipe` | Record swipe → triggers match |
| GET | `/api/matches` | List matches |
| POST | `/api/matches/:id/accept` | Landlord accepts match |
| GET | `/api/chat/:matchId` | Paginated messages |
| POST | `/api/recommendations/search` | NLP search (Gemini) |
| GET | `/api/landlord/dashboard` | Landlord analytics |
| POST | `/api/payments/premium` | Upgrade to premium (Meshulam) |

---

## Environment Variables

See `backend/.env.example` and `ai-service/.env.example` for all required variables.

Key variables:
- `GEMINI_API_KEY` — get free at [aistudio.google.com](https://aistudio.google.com/app/apikey)
- `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_UPLOAD_PRESET` — free at cloudinary.com
- `MESHULAM_API_KEY` — meshulam.co.il (Israeli payment gateway)

---

## Production Deploy (Kubernetes)

```bash
kubectl apply -f infrastructure/k8s/namespace.yaml
cp infrastructure/k8s/secrets.yaml.example infrastructure/k8s/secrets.yaml
# Edit secrets.yaml with real values
kubectl apply -f infrastructure/k8s/secrets.yaml
kubectl apply -f infrastructure/k8s/
```

---

## Project Structure

```
├── backend/           Node.js API
│   └── src/
│       ├── config/    DB connections (PG, Mongo, Redis, Kafka, Socket.io)
│       ├── models/    Sequelize (pg/) + Mongoose (mongo/) models
│       ├── routes/    auth, apartments, swipe, matches, chat, recommendations, landlord, payments
│       ├── services/  matchingService, geminiService, uploadService
│       └── middleware/ auth (JWT), errorHandler, rateLimiter
├── mobile/            React Native (Expo)
│   └── src/
│       ├── screens/   AuthScreen, SwipeScreen, MatchesScreen, ChatScreen, LandlordDashboard, LeadsScreen, SearchScreen
│       ├── components/ ApartmentCard, SwipeableCard, MatchCard
│       ├── store/     useAuthStore, useSwipeStore, useChatStore (Zustand)
│       ├── services/  api.ts (axios + SecureStore)
│       └── navigation/ AppNavigator (role-based tabs)
├── ai-service/        Python FastAPI
│   └── src/
│       ├── nlp_search.py          Gemini NLP parser + listing summary
│       ├── recommendation_engine.py Content-based + behavioural scoring
│       ├── lead_scoring.py        Lead ranking for landlords
│       └── routes/                FastAPI routers
├── infrastructure/
│   └── k8s/           Kubernetes manifests (namespace, deployments, HPA, ingress)
└── docker-compose.yml  Full local dev environment
```


you can use also the data in Info folder (.md files)