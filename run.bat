@echo off
TITLE Vinista - Instagram Downloader & PDF Studio
echo =======================================================
echo   VINISTA: ZERO-LOGIN REEL & POST DOWNLOADER + PDF MAKER
echo =======================================================
echo Activating Virtual Environment (venv)...
call venv\Scripts\activate.bat
echo Starting Flask server...
echo Open your browser at: http://127.0.0.1:5000
python app.py
pause

