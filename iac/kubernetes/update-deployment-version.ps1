# PowerShell script to update the Kubernetes deployment with the current version

# Get the directory of this script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentDir = Split-Path -Parent $scriptDir

# Read the version from version.txt
$versionFile = Join-Path $parentDir "version.txt"
if (-not (Test-Path $versionFile)) {
    Write-Host "Error: version.txt not found at $versionFile" -ForegroundColor Red
    exit 1
}

$version = Get-Content $versionFile -Raw
$version = $version.Trim()
Write-Host "Using version: $version" -ForegroundColor Cyan

# Update the deployment.yaml file
$deploymentFile = Join-Path $scriptDir "deployment.yaml"
if (-not (Test-Path $deploymentFile)) {
    Write-Host "Error: deployment.yaml not found at $deploymentFile" -ForegroundColor Red
    exit 1
}

# Read the deployment file
$content = Get-Content $deploymentFile -Raw

# Replace the image version
$pattern1 = 'image: ActiveDirectoryManager:[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[0-9]{4}'
$replacement1 = "image: ActiveDirectoryManager:$version"
$content = $content -replace $pattern1, $replacement1

$pattern2 = 'image: ActiveDirectoryManager:latest'
$replacement2 = "image: ActiveDirectoryManager:$version"
$content = $content -replace $pattern2, $replacement2

# Write the updated content back to the file
$content | Set-Content $deploymentFile

Write-Host "Updated deployment.yaml with version $version" -ForegroundColor Green
