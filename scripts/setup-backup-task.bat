@echo off
:: Run this ONCE as Administrator to register the daily backup task.
:: It will run every day at 3:00 AM.

schtasks /create ^
  /tn "AccsMarkets Daily DB Backup" ^
  /tr "\"C:\Users\americanhistory921\Desktop\accsmarkets\scripts\backup.bat\"" ^
  /sc DAILY ^
  /st 03:00 ^
  /ru SYSTEM ^
  /f

if %ERRORLEVEL% == 0 (
  echo.
  echo [OK] Task created: "AccsMarkets Daily DB Backup"
  echo      Runs every day at 03:00 AM
  echo      Logs written to: scripts\backup.log
) else (
  echo.
  echo [ERROR] Failed to create task. Make sure you run this as Administrator.
)

pause
