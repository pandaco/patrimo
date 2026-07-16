#!/bin/bash
COOKIE_JAR=$(mktemp)
curl -s -c $COOKIE_JAR http://localhost:3333/api/auth/dev-login > /dev/null
CSRF=$(grep patrimo_csrf $COOKIE_JAR | awk '{print $7}')
echo "CSRF: $CSRF"
echo "--- /api/etfs ---"
curl -s -b $COOKIE_JAR http://localhost:3333/api/etfs | jq .
echo "--- /api/portfolio ---"
curl -s -b $COOKIE_JAR http://localhost:3333/api/portfolio | jq .
echo "--- /api/transactions ---"
curl -s -b $COOKIE_JAR http://localhost:3333/api/transactions | jq .
rm $COOKIE_JAR
