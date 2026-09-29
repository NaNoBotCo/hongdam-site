#!/usr/bin/env bash
# Render tools/card_own.html to docs/own/card.jpg (1200x630).
set -euo pipefail
cd "$(dirname "$0")/.."
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
T=$(mktemp -d)
"$C" --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 \
  --allow-file-access-from-files --virtual-time-budget=3000 \
  --screenshot="$T/card.png" "file://$PWD/tools/card_own.html" 2>/dev/null
python3 -c "from PIL import Image;Image.open('$T/card.png').convert('RGB').save('docs/own/card.jpg','JPEG',quality=86,optimize=True)"
rm -rf "$T"
