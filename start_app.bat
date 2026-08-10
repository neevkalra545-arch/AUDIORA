@echo off
title Audiora Music Player Launcher
echo ===================================================
echo             Starting Audiora Music Player          
echo ===================================================
echo.
echo Launching Node.js backend server in a new window...
cd backend
start cmd /k "title Audiora Backend Server && npm start"
echo.
echo Waiting 3 seconds for server to initialize...
timeout /t 3 /nobreak > nul
echo.
echo Launching your web browser to http://localhost:3000...
start http://localhost:3000
echo.
echo ===================================================
echo  All done! Keep the server command window open.   
echo ===================================================
timeout /t 2 > nul
exit
