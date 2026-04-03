#!/bin/bash
set -e

# Fix db dependency on user
sed -i 's/import { UserProps } from "@oliver\/user";/import { UserProps } from "@oliver\/core";/' packages/db/src/mongodb/collections/UserCollection.ts

# Fix boards dependencies on auth
for svc in Asana Linear Trello Jira; do
  file="packages/boards/src/infrastructure/external/${svc}Service.ts"
  UPPER=$(echo $svc | tr '[:lower:]' '[:upper:]')
  
  if [ "$svc" = "Asana" ]; then
    REPL="const ASANA_CLIENT_ID = process.env.NEXT_PUBLIC_ASANA_CLIENT_ID || '';\nconst ASANA_CLIENT_SECRET = process.env.ASANA_CLIENT_SECRET || '';\nconst ASANA_CALLBACK_URL = process.env.ASANA_CALLBACK_URL || 'http://localhost:3000/api/boards/asana/callback';\nconst ASANA_AUTH_URL = 'https://app.asana.com/-/oauth_authorize';\nconst ASANA_TOKEN_URL = 'https://app.asana.com/-/oauth_token';\nconst ASANA_SCOPES = 'default offline_access';"
    sed -i "/from '@oliver\/auth';/d" "$file"
    sed -i "/ASANA_CLIENT_ID,/d" "$file"
    sed -i "/ASANA_CLIENT_SECRET,/d" "$file"
    sed -i "/ASANA_CALLBACK_URL,/d" "$file"
    sed -i "/ASANA_AUTH_URL,/d" "$file"
    sed -i "/ASANA_TOKEN_URL,/d" "$file"
    sed -i "/ASANA_SCOPES,/d" "$file"
    sed -i "s/import { BoardProviderError } from '@oliver\/shared';/import { BoardProviderError } from '@oliver\/shared';\n\n$REPL/" "$file"
    
  elif [ "$svc" = "Linear" ]; then
    REPL="const LINEAR_CLIENT_ID = process.env.NEXT_PUBLIC_LINEAR_CLIENT_ID || '';\nconst LINEAR_CLIENT_SECRET = process.env.LINEAR_CLIENT_SECRET || '';\nconst LINEAR_CALLBACK_URL = process.env.LINEAR_CALLBACK_URL || 'http://localhost:3000/api/boards/linear/callback';\nconst LINEAR_AUTH_URL = 'https://linear.app/oauth/authorize';\nconst LINEAR_TOKEN_URL = 'https://api.linear.app/oauth/token';\nconst LINEAR_SCOPES = 'read,write,offline_access';"
    sed -i "/from '@oliver\/auth';/d" "$file"
    sed -i "/LINEAR_CLIENT_ID,/d" "$file"
    sed -i "/LINEAR_CLIENT_SECRET,/d" "$file"
    sed -i "/LINEAR_CALLBACK_URL,/d" "$file"
    sed -i "/LINEAR_AUTH_URL,/d" "$file"
    sed -i "/LINEAR_TOKEN_URL,/d" "$file"
    sed -i "/LINEAR_SCOPES,/d" "$file"
    sed -i "s/import { BoardProviderError } from '@oliver\/shared';/import { BoardProviderError } from '@oliver\/shared';\n\n$REPL/" "$file"

  elif [ "$svc" = "Trello" ]; then
    REPL="const TRELLO_CLIENT_ID = process.env.NEXT_PUBLIC_TRELLO_CLIENT_ID || '';\nconst TRELLO_CLIENT_SECRET = process.env.TRELLO_CLIENT_SECRET || '';\nconst TRELLO_CALLBACK_URL = process.env.TRELLO_CALLBACK_URL || 'http://localhost:3000/api/boards/trello/callback';\nconst TRELLO_AUTH_URL = 'https://trello.com/1/authorize';\nconst TRELLO_TOKEN_URL = 'https://trello.com/1/OAuthGetAccessToken';\nconst TRELLO_SCOPES = 'read,write,account';"
    sed -i "/from '@oliver\/auth';/d" "$file"
    sed -i "/TRELLO_CLIENT_ID,/d" "$file"
    sed -i "/TRELLO_CLIENT_SECRET,/d" "$file"
    sed -i "/TRELLO_CALLBACK_URL,/d" "$file"
    sed -i "/TRELLO_AUTH_URL,/d" "$file"
    sed -i "/TRELLO_TOKEN_URL,/d" "$file"
    sed -i "/TRELLO_SCOPES,/d" "$file"
    sed -i "s/import { BoardProviderError } from '@oliver\/shared';/import { BoardProviderError } from '@oliver\/shared';\n\n$REPL/" "$file"

  elif [ "$svc" = "Jira" ]; then
    REPL="const JIRA_CLIENT_ID = process.env.NEXT_PUBLIC_JIRA_CLIENT_ID || '';\nconst JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET || '';\nconst JIRA_CALLBACK_URL = process.env.JIRA_CALLBACK_URL || 'http://localhost:3000/api/boards/jira/callback';\nconst JIRA_AUTH_URL = 'https://auth.atlassian.com/authorize';\nconst JIRA_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';\nconst JIRA_SCOPES = 'read:jira-work read:jira-user offline_access read:me';"
    sed -i "/from '@oliver\/auth';/d" "$file"
    sed -i "/JIRA_CLIENT_ID,/d" "$file"
    sed -i "/JIRA_CLIENT_SECRET,/d" "$file"
    sed -i "/JIRA_CALLBACK_URL,/d" "$file"
    sed -i "/JIRA_AUTH_URL,/d" "$file"
    sed -i "/JIRA_TOKEN_URL,/d" "$file"
    sed -i "/JIRA_SCOPES,/d" "$file"
    sed -i "s/import { BoardProviderError } from '@oliver\/shared';/import { BoardProviderError } from '@oliver\/shared';\n\n$REPL/" "$file"
  fi
done

