# Website watchdog - runs every 5 minutes via Windows Task Scheduler
# ("AccsMarkets Website Watchdog"). If nothing is listening on port 3000,
# starts the site directly with `node server.js`.
#
# Exists because PM2's daemon on this box has a persistent, unresolved
# cross-session named-pipe permission issue (EPERM connecting to
# \\.\pipe\rpc.sock from any session other than the one that created it -
# confirmed even from an elevated admin session). Rather than depend on
# that daemon, this watchdog supervises the site directly and independently.
$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$root = "C:\Users\americanhistory921\Desktop\accsmarkets"
$logFile = Join-Path $root "backups\watchdog.log"

function Write-Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
    $line | Out-File -FilePath $logFile -Append -Encoding utf8
}

$listening = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    # Healthy - nothing to do. Stay quiet; only log actual events (starts/failures).
    exit 0
}

Write-Log "Port 3000 not listening - starting the site."

Set-Location $root
$env:PORT = "3000"
$env:NODE_ENV = "production"

# Detached, hidden, independent of this watchdog script's own lifetime -
# survives after this script exits (same as PM2 would keep it running).
# stdout/stderr redirected to a real log file, unlike the bare unsupervised
# process this replaces, which had no logging at all.
Start-Process -FilePath "node" -ArgumentList "server.js" `
    -WorkingDirectory $root -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $root "backups\website-out.log") `
    -RedirectStandardError (Join-Path $root "backups\website-error.log")

Start-Sleep -Seconds 8
$nowListening = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($nowListening) {
    Write-Log "Site started successfully (PID $($nowListening.OwningProcess))."
} else {
    Write-Log "Site FAILED to start - check backups\website-error.log for details."
}
