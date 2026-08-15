@echo off
TITLE 🥥 CocoLoco Live Manager - Production Launcher
color 0B
cls
echo ====================================================
echo    COCOLOCO LIVE MANAGER - OPERATOR LAUNCHER v1
echo ====================================================

:: Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor instala Node.js desde https://nodejs.org/ e intenta nuevamente.
    pause
    exit /b
)

echo [1/3] Verificando dependencias y servicios...
if not exist "node_modules" (
    echo [INFO] Instalando dependencias por primera vez...
    call npm install
)

echo [2/3] Iniciando servidor Bridge y Cliente Vite...
start /min cmd /k "npm run dev"

echo [3/3] Abriendo panel de control en el navegador...
timeout /t 3 >nul
start http://localhost:5173

echo ====================================================
echo    ¡APLICACION LISTA Y OPERATIVA EN VIVO!
echo ====================================================
echo Puedes minimizar o cerrar esta ventana de terminal.
pause
