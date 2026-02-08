#!/bin/sh
set -e

REPO="abhi-arya1/wt"
INSTALL_DIR="/usr/local/bin"
BINARY_NAME="wt"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)   PLATFORM="linux" ;;
  Darwin)  PLATFORM="macos" ;;
  *)       echo "Error: Unsupported OS: $OS"; exit 1 ;;
esac

case "$ARCH" in
  x86_64|amd64) ARCH_SUFFIX="x64" ;;
  arm64|aarch64) ARCH_SUFFIX="arm" ;;
  *)             echo "Error: Unsupported architecture: $ARCH"; exit 1 ;;
esac

if [ "$PLATFORM" = "linux" ]; then
  ASSET_NAME="wt-linux"
elif [ "$PLATFORM" = "macos" ] && [ "$ARCH_SUFFIX" = "arm" ]; then
  ASSET_NAME="wt-macos-arm"
elif [ "$PLATFORM" = "macos" ] && [ "$ARCH_SUFFIX" = "x64" ]; then
  echo "Error: Intel Mac (x86_64) prebuilt binaries are no longer provided."
  echo "Please build from source instead:"
  echo ""
  echo "  git clone https://github.com/abhi-arya1/wt.git && cd wt"
  echo "  bun install && bun run build:macos-x64"
  echo "  sudo mv ./dist/wt-macos-x64 /usr/local/bin/wt"
  echo ""
  exit 1
else
  echo "Error: No prebuilt binary for $PLATFORM-$ARCH_SUFFIX"
  exit 1
fi

if [ -n "$1" ]; then
  VERSION="$1"
  TAG="v$VERSION"
else
  TAG="latest"
fi

if [ "$TAG" = "latest" ]; then
  DOWNLOAD_URL="https://github.com/$REPO/releases/latest/download/$ASSET_NAME"
else
  DOWNLOAD_URL="https://github.com/$REPO/releases/download/$TAG/$ASSET_NAME"
fi

echo "Installing $BINARY_NAME..."
echo "  Platform: $PLATFORM ($ARCH_SUFFIX)"
echo "  URL:      $DOWNLOAD_URL"
echo ""

TMPDIR="$(mktemp -d)"
TMPFILE="$TMPDIR/$BINARY_NAME"

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$DOWNLOAD_URL" -o "$TMPFILE"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMPFILE" "$DOWNLOAD_URL"
else
  echo "Error: curl or wget is required"
  exit 1
fi

chmod +x "$TMPFILE"

if [ -w "$INSTALL_DIR" ]; then
  mv "$TMPFILE" "$INSTALL_DIR/$BINARY_NAME"
else
  echo "Need sudo to install to $INSTALL_DIR"
  sudo mv "$TMPFILE" "$INSTALL_DIR/$BINARY_NAME"
fi

rm -rf "$TMPDIR"

echo ""
echo "$BINARY_NAME installed to $INSTALL_DIR/$BINARY_NAME"
echo "Run 'wt --help' to get started."
