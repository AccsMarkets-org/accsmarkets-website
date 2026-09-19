# AI blog automation trigger. Registered as a Windows Scheduled Task
# ("AccsMarkets Blog Cron"), running twice daily (09:00 and 15:00) to match
# the schedule vercel.json originally declared - that schedule never actually
# ran anywhere, since this app is deployed on Windows/Cloudflare Tunnel, not
# Vercel, and Vercel's crons block is only honored by Vercel's own platform.
$ErrorActionPreference = "Stop"
# [Console]::OutputEncoding fix (see run-backup.ps1 for the same fix and full
# explanation) - Windows PowerShell 5.1 (what Task Scheduler launches)
# otherwise garbles a native command/REST response's UTF-8 output.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = "C:\Users\americanhistory921\Desktop\accsmarkets"
$secret = (Get-Content (Join-Path $root ".env") |
  Select-String '^CRON_SECRET="?([^"]*)"?$').Matches.Groups[1].Value

if (-not $secret) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') CRON_SECRET not set in .env - skipping run." |
      Out-File -FilePath (Join-Path $root "backups\blog-cron.log") -Append -Encoding utf8
    exit 1
}

try {
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/cron/blog" -Method Post `
      -Headers @{ "Authorization" = "Bearer $secret" }
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') OK: $($result | ConvertTo-Json -Compress)" |
      Out-File -FilePath (Join-Path $root "backups\blog-cron.log") -Append -Encoding utf8
} catch {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') FAILED: $($_.Exception.Message)" |
      Out-File -FilePath (Join-Path $root "backups\blog-cron.log") -Append -Encoding utf8
}
