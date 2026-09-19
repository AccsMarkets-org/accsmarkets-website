// Referenced by the superseded ecosystem.config.js (PM2 doesn't work on this
// box — see that file's header comment). The actual running tunnel is
// started by scripts/watchdog-tunnel.ps1 via a Windows Scheduled Task
// ("AccsMarkets Tunnel Watchdog"), using a run token (not a credentials
// file) plus C:\cloudflared\config.yml for ingress rules. Kept in sync with
// that script's actual invocation in case PM2 is ever revived.
const { spawn } = require('child_process');
const fs = require('fs');

const cfHome = 'C:\\cloudflared';
const token = fs.readFileSync(`${cfHome}\\tunnel-token.txt`, 'utf8').trim();

const cf = spawn(
  `${cfHome}\\cloudflared.exe`,
  ['--config', `${cfHome}\\config.yml`, 'tunnel', 'run', '--token', token],
  { stdio: 'inherit' }
);

cf.on('exit', (code) => process.exit(code ?? 1));
