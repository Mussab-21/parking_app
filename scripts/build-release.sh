#!/usr/bin/env bash
set -e

# Default API URL (override by passing as argument or setting API_BASE_URL environment variable)
API_URL="${1:-${API_BASE_URL:-https://api.parksmart.pk/api/v1}}"

echo "=========================================="
echo " Building ParkSmart Flutter Release APK"
echo " Target API Base URL: $API_URL"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$PROJECT_ROOT/apps/mobile"

cd "$MOBILE_DIR"

echo "--> Fetching dependencies..."
flutter pub get

echo "--> Building release APK..."
flutter build apk --release --dart-define="API_BASE_URL=$API_URL"

echo ""
echo "=========================================="
echo " Build Completed Successfully!"
echo " Output APK: $MOBILE_DIR/build/app/outputs/flutter-apk/app-release.apk"
echo "=========================================="
