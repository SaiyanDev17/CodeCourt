# Build Judge Docker Images (PowerShell)
# 
# This script builds the custom Docker images for C++ and Python judges.
# These images are used by the submission worker to execute user code safely.
#
# Usage:
#   .\backend\docker\judges\build-judges.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔨 Building CodeCourt Judge Images..." -ForegroundColor Cyan
Write-Host ""

# Build C++ Judge Image
Write-Host "📦 Building C++ Judge Image (codecourt-judge-cpp)..." -ForegroundColor Yellow
docker build -t codecourt-judge-cpp -f backend/docker/judges/cpp/Dockerfile backend/docker/judges/cpp/
Write-Host "✅ C++ Judge Image built successfully" -ForegroundColor Green
Write-Host ""

# Build Python Judge Image
Write-Host "📦 Building Python Judge Image (codecourt-judge-python)..." -ForegroundColor Yellow
docker build -t codecourt-judge-python -f backend/docker/judges/python/Dockerfile backend/docker/judges/python/
Write-Host "✅ Python Judge Image built successfully" -ForegroundColor Green
Write-Host ""

# Verify images exist
Write-Host "🔍 Verifying images..." -ForegroundColor Yellow
docker images | Select-String "codecourt-judge"

Write-Host ""
Write-Host "✅ All judge images built successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the application: docker compose up"
Write-Host "2. Submit code via API or frontend"
Write-Host "3. Verify verdicts are returned correctly"
