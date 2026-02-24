@echo off
cd /d "%~dp0"

echo Uruchamiam serwer deweloperski...
start "Shotlab AI Tool - Serwer" cmd /k npm run dev

echo Oczekiwanie na start serwera...
timeout /t 4 /nobreak >nul

echo Otwieram aplikację w przeglądarce...
start http://localhost:5173

echo Gotowe. Aplikacja działa w nowym oknie konsoli. Zamknij je, aby zatrzymać serwer.
