# Productivity Tracker (Merged)

Single-package Express + EJS app with MongoDB.
- Serves /views and /public from the same server
- Exposes API at /api/* (no CORS needed)
- Security: helmet, compression, rate-limiter, mongo-sanitize, xss-clean

## Run
```bash
npm i
cp .env.example .env   # fill MONGODB_URI
npm run dev            # http://localhost:4000
```
