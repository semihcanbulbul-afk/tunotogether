@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Play Uno Server
cd /d "%~dp0"

if not exist "node_modules" (
  echo Gerekli paketler kuruluyor...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install basarisiz oldu.
    pause
    exit /b 1
  )
)

set "PORT=3000"
for /f "delims=" %%P in ('powershell -NoProfile -Command "$p=3000; while($p -le 3010){$used=Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue; if(-not $used){break}; $p++}; Write-Output $p"') do set "PORT=%%P"

if !PORT! GTR 3010 (
  echo 3000-3010 arasinda bos port bulunamadi.
  pause
  exit /b 1
)

echo.
echo Play Uno baslatiliyor...
echo Sunucu: http://localhost:!PORT!
echo Tarayici aciliyor...
echo Durdurmak icin bu pencereyi kapatabilirsin.
echo.
start "" "http://localhost:!PORT!"
set PORT=!PORT!
call npm start
pause
