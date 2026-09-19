#!/bin/bash
df -h / | tail -1
U=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$U" -ge 90 ]; then echo DISK_CRITICAL; else echo DISK_OK; fi
curl -s -m 10 -o /dev/null -w 'health=%{http_code}\n' https://zap.prostors.ru/health
curl -s -m 10 -o /dev/null -w 'prostors=%{http_code}\n' https://prostors.ru
curl -s -m 10 -o /dev/null -w 'app=%{http_code}\n' https://app.prostors.ru
curl -s -m 10 -o /dev/null -w 'ernest=%{http_code}\n' https://ernest.prostors.ru
