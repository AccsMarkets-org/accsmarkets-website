@echo off
:: AccsMarkets - AI Blog Automation Trigger
:: Called by Windows Task Scheduler ("AccsMarkets Blog Cron") at 09:00 and 15:00 daily.
:: Replaces vercel.json's crons block, which never fires on this Windows deployment.

cd /d "C:\Users\americanhistory921\Desktop\accsmarkets"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\run-blog-cron.ps1"
