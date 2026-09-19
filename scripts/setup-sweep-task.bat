@echo off
:: Run this ONCE as Administrator to register the recurring sweep task.
:: It will run every 15 minutes, indefinitely, starting today.

schtasks /create ^
  /tn "AccsMarkets Internal Sweep" ^
  /tr "\"C:\Users\americanhistory921\Desktop\accsmarkets\scripts\sweep.bat\"" ^
  /sc MINUTE ^
  /mo 15 ^
  /ru SYSTEM ^
  /f

if %ERRORLEVEL% == 0 (
  echo.
  echo [OK] Task created: "AccsMarkets Internal Sweep"
  echo      Runs every 15 minutes
  echo      Logs written to: scripts\sweep.log
) else (
  echo.
  echo [ERROR] Failed to create task. Make sure you run this as Administrator.
)

pause
