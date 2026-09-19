@echo off
:: AccsMarkets - Daily Database Backup to Google Drive
:: This batch file is called by Windows Task Scheduler

cd /d "C:\Users\americanhistory921\Desktop\accsmarkets"

:: Use the node in PATH (or specify full path if needed)
node scripts/backup.mjs >> scripts\backup.log 2>&1

echo Backup finished at %DATE% %TIME% >> scripts\backup.log
