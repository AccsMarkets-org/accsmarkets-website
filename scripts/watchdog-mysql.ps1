# MySQL 8.4 watchdog - runs every 5 minutes via Windows Task Scheduler
# ("AccsMarkets MySQL Watchdog"). If nothing is listening on port 3306,
# starts mysqld directly. Mirrors watchdog-website.ps1's approach.
$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$mysqlHome = "C:\mysql84"
$root = "C:\Users\americanhistory921\Desktop\accsmarkets"
$logFile = Join-Path $root "backups\watchdog-mysql.log"

function Write-Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
    $line | Out-File -FilePath $logFile -Append -Encoding utf8
}

$listening = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    exit 0
}

Write-Log "Port 3306 not listening - starting mysqld."

Start-Process -FilePath "$mysqlHome\bin\mysqld.exe" `
    -ArgumentList "--datadir=$mysqlHome\data", "--port=3306" `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $mysqlHome "logs\stdout.log") `
    -RedirectStandardError (Join-Path $mysqlHome "logs\stderr.log")

Start-Sleep -Seconds 8
$nowListening = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
if ($nowListening) {
    Write-Log "MySQL started successfully (PID $($nowListening.OwningProcess))."
} else {
    Write-Log "MySQL FAILED to start - check $mysqlHome\logs\stderr.log for details."
}
