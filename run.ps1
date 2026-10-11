Set-Location -Path $PSScriptRoot
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  AyurDAO - Enterprise Identity & Access Portal" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (-not (Test-Path "node_modules")) {
    Write-Host "[1/2] Installing dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "[1/2] Dependencies already installed." -ForegroundColor Green
}

Write-Host "[2/2] Starting server at http://localhost:3000..." -ForegroundColor Green
Start-Process "http://localhost:3000/AyurDAO_Gov_MFA.html"
node server_freeotp.js
