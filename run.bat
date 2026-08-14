@echo off
setlocal
rem  run.bat [port]  --  serve Pencil locally and open it in your browser.
rem  Binds to 127.0.0.1 only: js/keys.local.js holds live API keys and must
rem  not be reachable from anywhere else on the network.

cd /d "%~dp0"

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8080"
set "HOST=127.0.0.1"
set "URL=http://127.0.0.1:%PORT%/pencil.html"

if not exist "pencil.html" (
  echo [run.bat] pencil.html not found next to this script.
  exit /b 1
)

if not exist "js\keys.local.js" (
  echo [run.bat] Note: js\keys.local.js is missing, so the Claude/Grok/Gemini
  echo           designers will be hidden. The built-in designer still works.
  echo.
)

rem  Open the browser a moment after the server starts, without a second window.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 900; Start-Process '%URL%'" >nul 2>&1

where node >nul 2>&1
if %errorlevel%==0 (
  echo [run.bat] Serving with node on %URL%
  node server.js
  goto :done
)

where python >nul 2>&1
if %errorlevel%==0 (
  echo [run.bat] node not found - falling back to python on %URL%
  python -m http.server %PORT% --bind %HOST%
  goto :done
)

where py >nul 2>&1
if %errorlevel%==0 (
  echo [run.bat] node not found - falling back to py on %URL%
  py -m http.server %PORT% --bind %HOST%
  goto :done
)

echo [run.bat] Neither node nor python is on PATH.
echo           Install either one, or just double-click pencil.html - it works
echo           straight from the filesystem too.
exit /b 1

:done
endlocal
