# Chạy song song: Backend (ASP.NET) + Frontend (React)
# Run in PowerShell: .\run-both.ps1

$ErrorActionPreference = "Continue"

Write-Host "===== NOM CAFE - Khởi động =====" -ForegroundColor Cyan

# Backend
Write-Host "`n[1] Backend ASP.NET (port 5021)..." -ForegroundColor Yellow
Start-Process -FilePath "dotnet" -ArgumentList "run" -WorkingDirectory "D:\Asp\NguyenVoAnhKiet_2122110562-master\NguyenVoAnhKiet_2122110562" -NoNewWindow

# Frontend
Write-Host "[2] Frontend React (port 3000)..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory "D:\cafe-frontend" -NoNewWindow

Write-Host "`nBackend: http://localhost:5021" -ForegroundColor Green
Write-Host "Swagger: http://localhost:5021/swagger" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "`nĐang mở trình duyệt..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"

Write-Host "`n===== Xong! =====" -ForegroundColor Cyan
