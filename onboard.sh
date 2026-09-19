#!/bin/sh
# sh onboard.sh "Название магазина" slug [chat_id]
# имя без апострофов; slug формат ддммгггг-NNN
NAME="$1"; SLUG="$2"; CHAT="${3:-0}"
PASS=$(head -c 12 /dev/urandom | base64 | tr -dc 'a-z0-9' | head -c 8)
ID=$(sqlite3 data/parts.db "INSERT INTO tenants (name,slug,status,plan,expires_at) VALUES ('$NAME','$SLUG','active','trial',datetime('now','+30 day')); SELECT last_insert_rowid();")
sqlite3 data/parts.db "INSERT INTO tenant_config (id,brand_name,tg_chat_id,admin_password) VALUES ($ID,'$NAME','$CHAT','$PASS');"
echo "tenant_id=$ID password=$PASS"
echo "админка:  https://zap.prostors.ru/admin.html?tenant=$SLUG"
echo "витрина:  https://zap.prostors.ru/?tenant=$SLUG"
echo "бот:      /start $SLUG"
