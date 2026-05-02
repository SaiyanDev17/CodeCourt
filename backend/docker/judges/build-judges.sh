#!/bin/bash
# Build Judge Docker Images
# 
# This script builds the custom Docker images for C++ and Python judges.
# These images are used by the submission worker to execute user code safely.
#
# Usage:
#   bash backend/docker/judges/build-judges.sh
#
# Or on Windows (Git Bash):
#   bash backend/docker/judges/build-judges.sh

set -e  # Exit on error

echo "🔨 Building CodeCourt Judge Images..."
echo ""

# Build C++ Judge Image
echo "📦 Building C++ Judge Image (codecourt-judge-cpp)..."
docker build -t codecourt-judge-cpp backend/docker/judges/cpp/
echo "✅ C++ Judge Image built successfully"
echo ""

# Build Python Judge Image
echo "📦 Building Python Judge Image (codecourt-judge-python)..."
docker build -t codecourt-judge-python backend/docker/judges/python/
echo "✅ Python Judge Image built successfully"
echo ""

# Verify images exist
echo "🔍 Verifying images..."
docker images | grep codecourt-judge

echo ""
echo "✅ All judge images built successfully!"
echo ""
echo "Next steps:"
echo "1. Start the application: docker compose up"
echo "2. Submit code via API or frontend"
echo "3. Verify verdicts are returned correctly"
