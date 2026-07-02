#!/usr/bin/env bash
set -euo pipefail

print_usage() {
  echo "Usage: $0 [--dev|--prod]"
  echo "  --dev    Build in development mode (serves HTTP)"
  echo "  --prod   Build in production mode (serves HTTPS, auto-generates TLS certs if missing)"
  echo "  (default: --dev)"
}

MODE="dev"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev) MODE="dev" ;;
    --prod) MODE="prod" ;;
    -h|--help) print_usage; exit 0 ;;
    *) echo "Unknown option: $1"; print_usage; exit 1 ;;
  esac
  shift
done

LDFLAGS="-s -w"
if [ "$MODE" == "prod" ]; then
  LDFLAGS="$LDFLAGS -X main.BuildMode=prod"
else
  LDFLAGS="$LDFLAGS -X main.BuildMode=dev"
fi

echo "========================================"
echo "  Building FinTrack-ERP ($MODE mode)"
echo "========================================"

echo ""
echo "[1/3] Installing frontend dependencies..."
cd client
npm install --silent

echo ""
echo "[2/3] Building frontend (static export)..."
NEXT_PUBLIC_BACKEND_URL=/api/v1 npm run build

echo ""
echo "[3/3] Copying frontend build to embed directory..."
rm -rf ../frontend
cp -r out ../frontend
cd ..

echo ""
echo "Building Go binary..."
go build -ldflags="$LDFLAGS" -o fintrack-erp .

echo ""
echo "========================================"
echo "  Build complete: ./fintrack-erp"
echo "========================================"

if [ "$MODE" == "dev" ]; then
  echo "  Run: ./fintrack-erp"
  echo "  (serves HTTP on port 8090)"
else
  echo "  Run: ./fintrack-erp"
  echo "  (auto-generates TLS certs if missing, serves HTTPS on port 8090)"
fi
echo ""
