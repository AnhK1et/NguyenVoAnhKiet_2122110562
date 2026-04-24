@echo off
title NOM CAFE - Backend + Frontend
echo ===== NOM CAFE - Khoi dong =====
echo.
echo [1] Backend ASP.NET (port 5021)...
start "Backend" cmd /k "cd /d D:\Asp\NguyenVoAnhKiet_2122110562-master\NguyenVoAnhKiet_2122110562 && dotnet run"

timeout /t 3 /nobreak >nul

echo [2] Frontend React (port 3000)...
start "Frontend" cmd /k "cd /d D:\cafe-frontend && npm start"

echo.
echo Backend:   http://localhost:5021
echo Swagger:   http://localhost:5021/swagger
echo Frontend:  http://localhost:3000
echo.
start http://localhost:3000
echo Xong! Mo trinh duyet...
pause
