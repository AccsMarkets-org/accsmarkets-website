# Cloudflare Tunnel watchdog - runs every 5 minutes via Windows Task Scheduler
# ("AccsMarkets Tunnel Watchdog"). If no cloudflared process is running,
# starts the tunnel using the saved run token + local ingress config.
$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$cfHome = "C:\cloudflared"
$root = "C:\Users\americanhistory921\Desktop\accsmarkets"
$logFile = Join-Path $root "backups\watchdog-tunnel.log"

function Write-Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
    $line | Out-File -FilePath $logFile -Append -Encoding utf8
}

$running = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($running) {
    exit 0
}

Write-Log "cloudflared not running - starting tunnel."

$token = (Get-Content "$cfHome\tunnel-token.txt" -Raw).Trim()

Start-Process -FilePath "$cfHome\cloudflared.exe" `
    -ArgumentList "--config", "$cfHome\config.yml", "tunnel", "run", "--token", $token `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $cfHome "tunnel-out.log") `
    -RedirectStandardError (Join-Path $cfHome "tunnel-error.log")

Start-Sleep -Seconds 8
$nowRunning = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($nowRunning) {
    Write-Log "Tunnel started successfully (PID $($nowRunning.Id))."
} else {
    Write-Log "Tunnel FAILED to start - check $cfHome\tunnel-error.log for details."
}
