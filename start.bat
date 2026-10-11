@echo off
title AyurDAO + FreeOTP GovTheme
cd /d "%~dp0"

echo ========================================================
echo   AyurDAO - Enterprise Identity ^& Access Portal
echo ========================================================
echo.

if not exist node_modules (
  echo [1/2] Installing dependencies...
  call npm install
) else (
  echo [1/2] Dependencies already installed.
)

echo [2/2] Starting AyurDAO MFA Server...
echo Opening http://localhost:3000 in your browser...
start "" "http://localhost:3000/AyurDAO_Gov_MFA.html"
node server_freeotp.js
pause

