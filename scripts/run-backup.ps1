# Hourly DB backup -> Google Drive. Registered as a Windows Scheduled Task
# ("AccsMarkets Hourly Backup"), running as the current user (no admin
# needed — unlike the boot-time PM2 resurrect task, this doesn't need to
# run before anyone logs in).
$ErrorActionPreference = "Stop"
# 2026-09-14 fix: PowerShell 7.3+ treats a native command's stderr output as
# a terminating error when $ErrorActionPreference = "Stop", which was marking
# this task as failed (LastTaskResult=1) every run even though the backup
# itself succeeded — a caught-and-logged Google Drive upload failure inside
# backup-to-drive.ts writes to console.error (stderr), which doesn't rethrow,
# but PowerShell still treated the stderr line as reason to abort. Disabling
# that behavior lets this script's own exit code (from tsx) be the only
# thing that determines success/failure, matching the real intent.
$PSNativeCommandUseErrorActionPreference = $false
# tsx's stdout is UTF-8, but Windows PowerShell 5.1 (what Task Scheduler
# launches) assumes the system codepage when decoding a native command's
# output for the pipeline, garbling it into mojibake before Out-File ever
# sees it. Forcing the console's expected encoding to UTF-8 fixes decoding
# at the source, which the previous "-Encoding utf8" fix on Out-File alone
# did not cover (that only controls the encoding used to WRITE the file).
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location "C:\Users\americanhistory921\Desktop\accsmarkets"
# 2>&1 merges stdout+stderr; piped through Out-File -Encoding utf8 instead of
# the native *>> redirect, which silently wrote UTF-16LE under Windows
# PowerShell 5.1 (the interpreter Task Scheduler was launching), making the
# log unreadable to any plain-text/UTF-8 tool.
& "node_modules\.bin\tsx.cmd" "scripts\backup-to-drive.ts" 2>&1 |
    Out-File -FilePath "backups\backup.log" -Append -Encoding utf8
