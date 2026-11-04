@echo off
REM Start Love Is Like Coding on Windows.  Double-click or run run.bat, then open http://127.0.0.1:5000
cd /d "%~dp0"
if not exist .venv ( python -m venv .venv )
call .venv\Scripts\activate.bat
python -m pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
if "%WHATSAPP_NUMBER%"=="" set WHATSAPP_NUMBER=256748808436
if "%PORT%"=="" set PORT=5000
echo Open http://127.0.0.1:%PORT%
python app.py
