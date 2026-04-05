# CodeCourt Local Setup - Complete ✓

## Services Running

### Backend (Express API)
- **URL**: http://localhost:5000
- **Status**: ✓ Running
- **MongoDB**: ✓ Connected (localhost:27017)
- **Redis**: ✓ Connected (localhost:6379)
- **API Docs**: http://localhost:5000/api-docs

### Frontend (Next.js)
- **URL**: http://localhost:3000
- **Status**: ✓ Running
- **Connected to Backend**: ✓ Yes (http://localhost:5000)

### Docker Containers
- **MongoDB**: codecourt-mongo-1 (port 27017)
- **Redis**: codecourt-redis (port 6379)

## Quick Access

### Frontend
Open in browser: **http://localhost:3000**

### Backend API
- Health Check: http://localhost:5000/health
- Swagger Docs: http://localhost:5000/api-docs

### API Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/problems` - List problems
- `POST /api/submissions` - Submit code
- `GET /api/contests` - List contests
- `POST /api/agent/hint` - Request AI hint

## Test the Connection

### 1. Register a User (via Frontend)
Visit http://localhost:3000 and create an account

### 2. Or Test API Directly
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

## Stop Services

### Stop Frontend & Backend
```bash
# In your terminal, press Ctrl+C in each running process
```

### Stop Docker Containers
```bash
docker stop codecourt-mongo-1 codecourt-redis
```

## Restart Services

### Start Docker Containers
```bash
docker start codecourt-mongo-1 codecourt-redis
```

### Start Backend
```bash
cd backend
npm run dev
```

### Start Frontend
```bash
cd frontend
npm run dev
```

## Configuration Files

### Backend (.env)
- MongoDB: mongodb://localhost:27017/codecourt
- Redis: redis://localhost:6379
- Port: 5000

### Frontend (.env)
- API URL: http://localhost:5000
- Socket URL: http://localhost:5000
- AI Service URL: http://localhost:8000

## Issues Fixed
1. ✓ Duplicate service declarations in controllers
2. ✓ MongoDB container started with proper port mapping
3. ✓ Redis container recreated with proper port mapping
4. ✓ Frontend dependencies installed
5. ✓ Frontend .env file created

## Next Steps
1. Open http://localhost:3000 in your browser
2. Register a new user account
3. Start using the platform!

---
**Setup completed on**: 2026-04-04
