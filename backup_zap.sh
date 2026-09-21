#!/bin/bash
set -e
D=/root/zapdemo/backups
T=$D/zap-full-$(date +%Y%m%d).tar.gz
K=$(grep '^BACKUP_KEY=' /root/zapdemo/.env | cut -d= -f2)
tar -czf $T -C /root/zapdemo/data .
openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -in $T -out ${T}.enc -pass pass:$K
rm -f $T
find $D -name 'zap-full-*.tar.gz.enc' -mtime +7 -delete
echo "BACKUP_OK $(date) $T.enc ($(du -h ${T}.enc | cut -f1))" >> $D/backup_zap.log
