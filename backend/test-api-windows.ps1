# PowerShell Script to Test CodeCourt API
# Run: .\test-api-windows.ps1

Write-Host "`n🧪 CodeCourt API Test (Windows)`n" -ForegroundColor Cyan
Write-Host "=" * 50

# Configuration
$baseUrl = "http://localhost:5000/api"
$email = "admin@codecourt.com"
$password = "admin123"

# Step 1: Login
Write-Host "`n🔐 Step 1: Login..." -ForegroundColor Yellow

$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody
    
    $token = $loginResponse.accessToken
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   Username: $($loginResponse.user.username)"
    Write-Host "   Email: $($loginResponse.user.email)"
    Write-Host "   Role: $($loginResponse.user.role)"
    Write-Host "   Token: $($token.Substring(0, 20))..."
    
} catch {
    Write-Host "❌ Login failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
    Write-Host "`n💡 Make sure:" -ForegroundColor Yellow
    Write-Host "   1. Backend is running (npm run dev)"
    Write-Host "   2. Admin user exists (node create-admin.js)"
    Write-Host "   3. Email and password are correct"
    exit 1
}

# Step 2: List Problems
Write-Host "`n📋 Step 2: List Problems..." -ForegroundColor Yellow

try {
    $problems = Invoke-RestMethod -Uri "$baseUrl/problems" -Method GET
    
    Write-Host "✅ Found $($problems.Count) problem(s)" -ForegroundColor Green
    
    if ($problems.Count -gt 0) {
        foreach ($problem in $problems) {
            Write-Host "   - $($problem.title) ($($problem.difficulty))"
        }
    } else {
        Write-Host "   No problems yet. Run: node add-sample-problem.js"
    }
    
} catch {
    Write-Host "❌ Failed to list problems" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
}

# Step 3: Create a Test Problem
Write-Host "`n📝 Step 3: Create Test Problem..." -ForegroundColor Yellow

$problemBody = @{
    title = "Test Problem from PowerShell"
    slug = "test-problem-ps"
    description = "This is a test problem created via PowerShell script"
    constraints = "Test constraints"
    timeLimit = 2000
    memoryLimit = 256
    difficulty = "easy"
    sampleTestCases = @(
        @{
            input = "test input"
            output = "test output"
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $newProblem = Invoke-RestMethod -Uri "$baseUrl/problems" `
        -Method POST `
        -Headers $headers `
        -Body $problemBody
    
    Write-Host "✅ Problem created!" -ForegroundColor Green
    Write-Host "   ID: $($newProblem._id)"
    Write-Host "   Title: $($newProblem.title)"
    Write-Host "   Status: $($newProblem.status)"
    
    $problemId = $newProblem._id
    
} catch {
    Write-Host "⚠️  Could not create problem" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)"
    
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "   Problem with this slug already exists"
    }
}

# Summary
Write-Host "`n" + "=" * 50
Write-Host "`n🎉 API Test Complete!`n" -ForegroundColor Green

Write-Host "📚 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Use Swagger UI: http://localhost:5000/api-docs"
Write-Host "   2. Or use Postman for easier testing"
Write-Host "   3. Add problems: node add-sample-problem.js"
Write-Host "   4. Generate tests: node generate-test-cases.js"
Write-Host ""
