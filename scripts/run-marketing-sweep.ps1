# Daily re-engagement email sweep. Registered as a Windows Scheduled Task
# ("AccsMarkets Marketing Sweep"), running as the current user — no admin
# needed, this isn't a boot-time job.
$ErrorActionPreference = "Stop"
# [Console]::OutputEncoding fix (see run-backup.ps1 for the same fix and full
# explanation) — Windows PowerShell 5.1 (what Task Scheduler launches)
# otherwise garbles a native command/REST response's UTF-8 output.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$secret = (Get-Content "C:\Users\americanhistory921\Desktop\accsmarkets\.env" |
  Select-String '^INTERNAL_SWEEP_SECRET="?([^"]*)"?$').Matches.Groups[1].Value
# Port corrected from 3001 to 3000 — the app's actual PORT (see .env); this
# script would have failed with a connection-refused error at the old port.
Invoke-RestMethod -Uri "http://localhost:3000/api/internal/marketing-sweep" `
  -Method Post -Headers @{ "x-sweep-secret" = $secret } 2>&1 |
  Out-File -FilePath "C:\Users\americanhistory921\Desktop\accsmarkets\backups\marketing-sweep.log" -Append -Encoding utf8
