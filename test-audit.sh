#!/bin/bash
COOKIE_JAR=$(mktemp)
curl -s -c $COOKIE_JAR http://localhost:3333/api/auth/dev-login > /dev/null
curl -s -b $COOKIE_JAR http://localhost:3333/api/audit-log | jq .
rm $COOKIE_JAR
