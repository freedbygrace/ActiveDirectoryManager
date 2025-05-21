# PowerShell script to update version and apply it to all components

# Get the directory of this script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Update version.txt with current date/time
Write-Host "Updating version.txt..." -ForegroundColor Cyan
& "$scriptDir\update-version.ps1"

# Read the new version
$version = Get-Content "$scriptDir\version.txt" -Raw
$version = $version.Trim()
Write-Host "New version: $version" -ForegroundColor Green

# Update Kubernetes deployment
Write-Host "Updating Kubernetes deployment..." -ForegroundColor Cyan
& "$scriptDir\kubernetes\update-deployment-version.ps1"

Write-Host "Version update complete. New version: $version" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Build Docker image: cd $scriptDir\docker; .\build.ps1" -ForegroundColor Yellow
Write-Host "2. Push Docker image: cd $scriptDir\docker; .\build.ps1 -push" -ForegroundColor Yellow
Write-Host "3. Deploy to Kubernetes: cd $scriptDir\kubernetes; kubectl apply -k ." -ForegroundColor Yellow
