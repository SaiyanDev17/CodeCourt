# CodeCourt MVP

A competitive programming judge and contest platform with AI-powered hints.

## Overview

CodeCourt is a full-stack web application that enables users to solve coding problems, participate in timed contests, and receive AI-generated hints. The platform features secure code execution in sandboxed environments, real-time verdict updates, and live leaderboards.

## Architecture

- **Backend**: Express.js API with MongoDB, Redis, and BullMQ
- **AI Service**: FastAPI with LangChain + Groq (Llama 3.3 70B)
- **Frontend**: Next.js 14 with Tailwind CSS
- **Judge Engine**: Docker containers (local) / Kubernetes Jobs (production)
- **Real-time**: Socket.io for verdict and leaderboard updates
- **Infrastructure**: Terraform (AWS S3, MongoDB Atlas, Oracle Cloud K8s)

## Features

- **User Authentication**: JWT-based auth with access/refresh token rotation
- **Role-Based Access**: Admin, Problem Setter, and Contestant roles
- **Problem Management**: Create, approve, and publish coding problems
- **Code Execution**: Sandboxed C++ and Python judge with resource limits
- **Contests**: ICPC-style scoring with real-time leaderboards
- **AI Hints**: LangChain agent provides up to 3 hints per problem
- **Real-time Updates**: Socket.io pushes verdicts and leaderboard changes

## Tech Stack

| Layer | Technology |
|-------|------------|
| API | Express.js, Node.js 20 |
| Database | MongoDB Atlas (Mongoose) |
| Cache/Queue | Redis, BullMQ |
| AI | FastAPI, LangChain, Groq API |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| State | Zustand |
| Real-time | Socket.io |
| Storage | AWS S3 |
| Containerization | Docker, Docker Compose |
| Orchestration | Kubernetes (Oracle Cloud OKE) |
| IaC | Terraform |
| CI/CD | GitHub Actions |

## Prerequisites

Install the following tools before starting:

- Node.js 20.x LTS
- Python 3.11.x
- Docker Desktop
- Minikube
- kubectl
- Terraform CLI 1.7.x
- MongoDB Compass
- Postman
- Git 2.x

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/<org>/codecourt.git
cd codecourt
```

### 2. Start Redis

```bash
docker run -d -p 6379:6379 --name codecourt-redis redis:alpine
```

### 3. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and secrets
npm install
npm run dev
```

### 4. AI Service Setup

```bash
cd ai-service
cp .env.example .env
# Add your GROQ_API_KEY to .env
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 5. Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 6. Access Application

- Frontend: http://localhost:3000
- API: http://localhost:5000
- AI Service: http://localhost:8000
- API Docs: http://localhost:5000/api-docs

## Docker Compose (Alternative)

Run all services with Docker Compose:

```bash
docker compose up
```

## Project Structure

```
codecourt/
├── backend/           # Express.js API
├── ai-service/        # FastAPI AI service
├── frontend/          # Next.js frontend
├── terraform/         # Infrastructure as Code
├── scripts/           # Utility scripts
├── .github/workflows/ # CI/CD pipelines
└── docker-compose.yml
```

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Run linters: `npm run lint` (backend/frontend) or `ruff check` (AI service)
4. Run tests: `npm test` (backend) or `pytest` (AI service)
5. Commit and push: `git push origin feature/your-feature`
6. Open a pull request

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### AI Service Tests
```bash
cd ai-service
pytest
```

### Property-Based Tests
The project includes property-based tests using fast-check for:
- Auth token rotation uniqueness
- Judge verdict completeness and determinism
- Hint count ceiling enforcement
- ICPC score monotonicity
- Leaderboard ordering invariants

## Deployment

### Infrastructure Provisioning

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
terraform plan
terraform apply
```

### Kubernetes Deployment

```bash
# Create secrets
kubectl create secret generic codecourt-secrets \
  --from-literal=MONGODB_URI=... \
  --from-literal=JWT_ACCESS_SECRET=... \
  --from-literal=JWT_REFRESH_SECRET=... \
  -n codecourt

# Deploy
kubectl apply -f backend/k8s/
```

### CI/CD

GitHub Actions automatically:
- Runs lint and tests on pull requests
- Builds and pushes Docker images on merge to main
- Deploys to Kubernetes cluster

## API Documentation

Swagger UI is available at `/api-docs` when the backend is running.

Key endpoints:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/problems` - List problems
- `POST /api/submissions` - Submit code
- `GET /api/contests/:id/leaderboard` - Get leaderboard
- `POST /api/agent/hint` - Request AI hint

## Environment Variables

See `.env.example` files in each service directory for required configuration.

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure all CI checks pass

## License

[Add your license here]

## Team

- P1: Infrastructure, Auth, Problems
- P2: Judge Engine, Docker, Kubernetes
- P3: Frontend, Contests, Socket.io
- P4: AI Service, Caching, CI/CD

## Support

For issues and questions, please open a GitHub issue.
