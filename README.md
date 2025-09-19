# Smart Crop Advisory - Backend (Phase 1 MVP)

## Quick start

1. Copy `.env.example` to `.env` and set `OPENWEATHER_KEY`.
2. Install:
    npm install
3. Start (development):
    npm run dev
4. Server runs on `http://localhost:5000/`.

## Endpoints

### Health
GET `/`  
Response: `{ status: "ok", message: "Smart Crop Advisory API is running 🚀" }`

### Weather proxy
GET `/api/weather?lat={lat}&lon={lon}`  
Returns OpenWeather One Call data (cached for 15 minutes).

Example:
