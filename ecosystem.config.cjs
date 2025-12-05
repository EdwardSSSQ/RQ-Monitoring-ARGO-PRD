module.exports = {
  apps: [{
    name: 'rqi-monitoreo-argocd',
    script: 'index.js',
    // Sin args para que use el modo continuo (cada minuto con cron interno)
    autorestart: true, // Reiniciar si se cae
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    instances: 1
  }]
};

