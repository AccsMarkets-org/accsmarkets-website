@echo off
:: AccsMarkets - Internal Maintenance Sweep
:: This batch file is called by Windows Task Scheduler every 15 minutes.

cd /d "C:\Users\americanhistory921\Desktop\accsmarkets"

node scripts/sweep.mjs >> scripts\sweep.log 2>&1
