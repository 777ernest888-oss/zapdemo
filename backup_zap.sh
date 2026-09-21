#!/bin/bash
set -e
D=/root/zapdemo/backups
T=$D/zap-full-$(date +%Y%m%d).tar.gz
tar -czf $T -C /root/zapdemo/data .
find $D -name 'zap-full-*.tar.gz' -mtime +7 -delete
echo "BACKUP_OK $T $(du -h $T | cut -f1)"
