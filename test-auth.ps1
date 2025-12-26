# Test Authentication Endpoints

Write-Host "`n=== Testing Admin Authentication ===" -ForegroundColor Cyan

# 1. Create Admin User
Write-Host "`n1. Creating admin user..." -ForegroundColor Yellow
$registerBody = @{
    email = "admin@selfcontrol.com"
    password = "SecurePassword123!"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
        -Method POST `
        -Body $registerBody `
        -ContentType "application/json"
    
    Write-Host "✅ Admin created successfully!" -ForegroundColor Green
    $registerResponse | ConvertTo-Json
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# 2. Login
Write-Host "`n2. Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@selfcontrol.com"
    password = "SecurePassword123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "Token: $($loginResponse.token.Substring(0, 50))..." -ForegroundColor Gray
    
    $token = $loginResponse.token
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# 3. Verify Token
if ($token) {
    Write-Host "`n3. Verifying token..." -ForegroundColor Yellow
    try {
        $verifyResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/verify" `
            -Method GET `
            -Headers @{ Authorization = "Bearer $token" }
        
        Write-Host "✅ Token is valid!" -ForegroundColor Green
        $verifyResponse | ConvertTo-Json
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 4. Test Protected Endpoint
    Write-Host "`n4. Testing protected endpoint (GET /api/management/devices)..." -ForegroundColor Yellow
    try {
        $devicesResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/management/devices" `
            -Method GET `
            -Headers @{ Authorization = "Bearer $token" }
        
        Write-Host "✅ Access granted to protected endpoint!" -ForegroundColor Green
        $devicesResponse | ConvertTo-Json
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 5. Test Protected Endpoint Without Token
    Write-Host "`n5. Testing protected endpoint WITHOUT token (should fail)..." -ForegroundColor Yellow
    try {
        $noAuthResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/management/devices" `
            -Method GET
        
        Write-Host "❌ Unexpected: Access granted without token!" -ForegroundColor Red
    } catch {
        Write-Host "✅ Correctly blocked: $($_.ErrorDetails.Message)" -ForegroundColor Green
    }
}

Write-Host "`n=== Tests Complete ===" -ForegroundColor Cyan
