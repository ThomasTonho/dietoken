#!/bin/sh
set -e

REPO="ThomasTonho/dietoken"
BRANCH="main"
BUNDLE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}/dist/dietoken.cjs"
INSTALL_DIR="${DIETOKEN_INSTALL_DIR:-/usr/local/bin}"

if ! command -v node >/dev/null 2>&1; then
  echo "dietoken requires Node.js (>=18). Install it from https://nodejs.org and retry." >&2
  exit 1
fi

echo "Installing dietoken from ${BUNDLE_URL}..."

TMP=$(mktemp)
if ! curl -fsSL "$BUNDLE_URL" -o "$TMP"; then
  echo "Download failed. Check your connection and try again." >&2
  rm -f "$TMP"
  exit 1
fi

chmod +x "$TMP"

if [ -w "$INSTALL_DIR" ]; then
  mv "$TMP" "$INSTALL_DIR/dietoken"
else
  sudo mv "$TMP" "$INSTALL_DIR/dietoken"
fi

echo "dietoken installed to $INSTALL_DIR/dietoken"
echo ""
echo "Run: dietoken scan"
