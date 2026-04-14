# Windows Quick Start Guide

This guide is specifically for **Windows users** using PowerShell.

---

## 🚀 Complete Setup (5 Minutes)

### Step 1: Create Admin User

```powershell
cd backend
node create-admin.js
```

**Enter details when prompted:**
- Username: `admin`
- Email: `admin@codecourt.com`
- Password: `admin123`

---

### Step 2: Test API with PowerShell Script

```powershell
.\test-api-windows.ps1
```

This will:
- ✅ Login with your admin account
- ✅ List existing problems
- ✅ Create a test problem
- ✅ Show you the API is working

---

### Step 3: Use Swagger UI (Easiest!)

1. **Open browser**: http://localhost:5000/api-docs
2. **You'll see all API endpoints** with interactive forms
3. **Click "Authorize"** button (top right)
4. **Login first** via `/api/auth/login` to get token
5. **Copy the `accessToken`** from response
6. **Click "Authorize"** again and enter: `Bearer YOUR_TOKEN`
7. **Now you can test all endpoints!**

---

## 📋 Windows PowerShell Commands

### Login

```powershell
$body = @{
    email = "admin@codecourt.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

# Save token
$token = $response.accessToken

# View response
$response
```

### List Problems

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/problems" -Method GET
```

### Create Problem

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$problemBody = @{
    title = "Two Sum"
    slug = "two-sum"
    description = "Given an array..."
    constraints = "2 <= nums.length <= 10^4"
    timeLimit = 2000
    memoryLimit = 256
    difficulty = "easy"
    sampleTestCases = @(
        @{
            input = "4\n2 7 11 15\n9"
            output = "0 1"
        }
    )
} | ConvertTo-Json -Depth 10

$problem = Invoke-RestMethod -Uri "http://localhost:5000/api/problems" `
    -Method POST `
    -Headers $headers `
    -Body $problemBody

# Save problem ID
$problemId = $problem._id
```

### Upload Test Cases (Multipart Form Data)

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$filePath = ".\hidden-tests.zip"

# Create multipart form data
$form = @{
    testCases = Get-Item -Path $filePath
}

Invoke-RestMethod -Uri "http://localhost:5000/api/problems/$problemId/upload-tests" `
    -Method POST `
    -Headers $headers `
    -Form $form
```

### Approve Problem

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/problems/$problemId/approve" `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $token" }
```

---

## 🎯 Recommended Tools for Windows

### 1. Swagger UI (Built-in) ⭐⭐⭐

**Best for:** Quick testing, exploring API

- **URL**: http://localhost:5000/api-docs
- **Pros**: No installation, interactive, built-in
- **Cons**: None!

### 2. Postman ⭐⭐⭐

**Best for:** Complex requests, collections, testing workflows

- **Download**: https://www.postman.com/downloads/
- **Pros**: Professional, powerful, easy to use
- **Cons**: Requires installation

### 3. Thunder Client (VS Code) ⭐⭐

**Best for:** Testing while coding

- **Install**: VS Code Extension Marketplace
- **Pros**: Integrated with VS Code, lightweight
- **Cons**: Requires VS Code

### 4. PowerShell Scripts ⭐

**Best for:** Automation, CI/CD

- **Pros**: No extra tools needed
- **Cons**: More verbose syntax

---

## 📝 Complete Workflow (Windows)

### Using Swagger UI (Recommended)

```powershell
# 1. Create admin
cd backend
node create-admin.js

# 2. Add sample problem
node add-sample-problem.js

# 3. Generate test cases
npm install archiver
node generate-test-cases.js

# 4. Open Swagger UI
start http://localhost:5000/api-docs

# 5. In Swagger UI:
#    - Login via POST /api/auth/login
#    - Copy accessToken
#    - Click "Authorize" → Enter "Bearer YOUR_TOKEN"
#    - Upload tests via POST /api/problems/{id}/upload-tests
#    - Approve via POST /api/problems/{id}/approve
```

### Using PowerShell Script

```powershell
# 1. Create admin
node create-admin.js

# 2. Test API
.\test-api-windows.ps1

# 3. Add problems
node add-sample-problem.js

# 4. Generate tests
node generate-test-cases.js

# 5. Upload manually via Swagger UI or Postman
```

---

## 🐛 Windows-Specific Issues

### Issue: "curl: command not found"

**Solution:** Use `Invoke-RestMethod` instead of `curl`

```powershell
# ❌ Don't use (Linux syntax)
curl -X POST http://localhost:5000/api/auth/login

# ✅ Use (PowerShell syntax)
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST
```

### Issue: "Execution policy" error

**Solution:** Allow script execution

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: "Cannot bind parameter 'X'"

**Solution:** PowerShell's `curl` is an alias for `Invoke-WebRequest`, not the real curl

```powershell
# Option 1: Use Invoke-RestMethod
Invoke-RestMethod -Uri "..." -Method POST

# Option 2: Install real curl
winget install curl

# Option 3: Use Swagger UI or Postman
```

### Issue: JSON formatting in PowerShell

**Solution:** Use `-Depth` parameter

```powershell
# ❌ May truncate nested objects
$body | ConvertTo-Json

# ✅ Properly handles nested objects
$body | ConvertTo-Json -Depth 10
```

---

## 🔧 Useful PowerShell Aliases

Add these to your PowerShell profile for easier commands:

```powershell
# Open profile
notepad $PROFILE

# Add these aliases
function api-login {
    Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email":"admin@codecourt.com","password":"admin123"}'
}

function api-problems {
    Invoke-RestMethod -Uri "http://localhost:5000/api/problems" -Method GET
}

function swagger {
    start http://localhost:5000/api-docs
}

# Save and reload
. $PROFILE
```

**Usage:**
```powershell
api-login      # Quick login
api-problems   # List problems
swagger        # Open Swagger UI
```

---

## ✅ Quick Commands Reference

```powershell
# Create admin
node create-admin.js

# Test API
.\test-api-windows.ps1

# Add sample problem
node add-sample-problem.js

# Generate test cases
node generate-test-cases.js

# Open Swagger UI
start http://localhost:5000/api-docs

# Login via PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"admin@codecourt.com","password":"admin123"}'

# List problems
Invoke-RestMethod -Uri "http://localhost:5000/api/problems" -Method GET
```

---

## 🎉 You're All Set!

**Recommended workflow for Windows:**

1. ✅ Use **Swagger UI** for API testing (easiest!)
2. ✅ Use **Node scripts** for automation
3. ✅ Use **Postman** for complex workflows (optional)
4. ✅ Use **PowerShell** for CI/CD (advanced)

**Next:** Open http://localhost:5000/api-docs and start testing! 🚀
