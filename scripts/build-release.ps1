param (
    [string]$ApiBaseUrl = $(if ($env:API_BASE_URL) { $env:API_BASE_URL } else { "https://api.parksmart.pk/api/v1" })
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Building ParkSmart Flutter Release APK" -ForegroundColor Cyan
Write-Host " Target API Base URL: $ApiBaseUrl" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$MobileDir = Join-Path $ProjectRoot "apps\mobile"

Push-Location $MobileDir

try {
    Write-Host "--> Fetching dependencies..." -ForegroundColor Yellow
    flutter pub get

    Write-Host "--> Building release APK..." -ForegroundColor Yellow
    flutter build apk --release --dart-define="API_BASE_URL=$ApiBaseUrl"

    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host " Build Completed Successfully!" -ForegroundColor Green
    Write-Host " Output APK: $MobileDir\build\app\outputs\flutter-apk\app-release.apk" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
}
finally {
    Pop-Location
}
