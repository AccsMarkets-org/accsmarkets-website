// SUPERSEDED — this PM2 config is not the active deployment mechanism.
//
// PM2's daemon on this box has a persistent, unresolved cross-session
// named-pipe permission issue (EPERM connecting to \\.\pipe\rpc.sock from any
// session other than the one that created it — confirmed even from an
// elevated admin session; see scripts/watchdog-website.ps1's own comment for
// the full diagnosis). The real, working process-supervision mechanism is
// three independent Windows Scheduled Tasks running the watchdog-*.ps1
// scripts every 5 minutes ("AccsMarkets Website Watchdog",
// "AccsMarkets MySQL Watchdog", "AccsMarkets Tunnel Watchdog"), plus
// "AccsMarkets Internal Sweep" and "AccsMarkets Hourly Backup" for the other
// scheduled jobs. Do not `pm2 start` this file expecting it to behave like a
// normal PM2 setup — it will very likely hit the same pipe error.
//
// Paths below are still kept accurate (not left stale) in case the PM2 issue
// is ever resolved upstream, but this is not what's actually running today.
module.exports = {
  apps: [
    {
      // The real production database (XAMPP's MariaDB in C:\xampp is stale,
      // abandoned July 2026 — if it ever grabs port 3306 first, the site
      // serves old data). Managed by PM2 so it survives reboots with the rest.
      name: "mysql84",
      script: "C:\\mysql84\\bin\\mysqld.exe",
      args: [
        "--datadir=C:\\mysql84\\data",
        "--port=3306",
        "--console",
      ],
      autorestart: true,
      watch: false,
      restart_delay: 5000,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
    {
      name: "accsmarkets",
      script: "server.js",
      cwd: "C:\\Users\\americanhistory921\\Desktop\\accsmarkets",
      env: {
        PORT: 3000,
      },
      // Auto-restart if it crashes
      autorestart: true,
      watch: false,
      // Wait 5s before restarting after a crash
      restart_delay: 5000,
      // Give up after 10 consecutive crashes
      max_restarts: 10,
      // Log files
      out_file: "C:\\Users\\americanhistory921\\.pm2\\logs\\accsmarkets-out.log",
      error_file: "C:\\Users\\americanhistory921\\.pm2\\logs\\accsmarkets-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Wait for MySQL to be ready before starting
      wait_ready: false,
      kill_timeout: 5000,
    },
    {
      name: "cloudflare-tunnel",
      script: "start-tunnel.js",
      cwd: "C:\\Users\\americanhistory921\\Desktop\\accsmarkets",
      autorestart: true,
      watch: false,
      restart_delay: 5000,
      out_file: "C:\\Users\\americanhistory921\\.pm2\\logs\\cloudflare-tunnel-out.log",
      error_file: "C:\\Users\\americanhistory921\\.pm2\\logs\\cloudflare-tunnel-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
