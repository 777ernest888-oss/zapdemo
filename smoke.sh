#!/bin/sh
curl -sf http://127.0.0.1:3000/health && echo ' HEALTH_OK' || echo 'HEALTH_FAIL'
curl -sf "http://127.0.0.1:3000/api/products?limit=1" >/dev/null && echo 'API_OK' || echo 'API_FAIL'
docker exec zap_app node -e "require('/app/src/db');console.log('DB_OK')" || echo 'DB_FAIL'