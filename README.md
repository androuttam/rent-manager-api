# Rent Manager API

Node.js + Express + MongoDB (Atlas) backend for the rent/flat management app.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill real values (Atlas URI, JWT secret, Cloudinary keys).
3. `npm run dev` (development) or `npm start` (production).

## Health check
GET `/` returns `{ "status": "ok" }`.
