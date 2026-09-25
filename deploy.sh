#!/usr/bin/env bash
# Deploy hongdam.net — Cloudflare Pages project "hongdam"
# Usage:  ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

KEYS="$HOME/.config/nanobotco/keys.json"
export CLOUDFLARE_API_TOKEN=$(python3 -c "import json;print(json.load(open('$KEYS'))['cloudflare']['api_token'])")
export CLOUDFLARE_ACCOUNT_ID=$(python3 -c "import json;print(json.load(open('$KEYS'))['cloudflare']['account_id'])")

echo "Deploying docs/ -> hongdam.pages.dev ..."
npx --yes wrangler@latest pages deploy docs \
  --project-name=hongdam --branch=main --commit-dirty=true

echo
echo "Live:  https://hongdam.pages.dev"
echo "Apex:  https://hongdam.net   (works once nameservers point at Cloudflare)"
