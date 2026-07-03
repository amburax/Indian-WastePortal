/**
 * PM2 process manager config — keeps the filing worker running persistently
 * with auto-restart + log capture.
 *
 *   pm2 start ecosystem.config.cjs           # start
 *   pm2 logs iwp-worker                       # tail logs
 *   pm2 restart iwp-worker                    # restart after a deploy
 *   pm2 save && pm2 startup                   # survive machine reboots
 *
 * Note: in real production, set env vars in the shell/PM2 env block rather than
 * relying on --env-file=.env.local (which is a local-dev convenience).
 */
module.exports = {
  apps: [
    {
      name: 'iwp-worker',
      script: 'workers/queue-consumer.js',
      node_args: '--env-file=.env.local',
      instances: 1,               // a single consumer; OTP intercept is stateful
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,        // back off 5s between crash restarts
      max_memory_restart: '600M', // Playwright/Chromium can leak — recycle
      kill_timeout: 10000,        // let an in-flight filing finish gracefully
      env: {
        NODE_ENV: 'production',
        AGENT_HEADLESS: 'true',
      },
      out_file: 'logs/worker-out.log',
      error_file: 'logs/worker-err.log',
      time: true,                 // timestamp log lines
    },
  ],
};
