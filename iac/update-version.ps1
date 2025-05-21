# PowerShell script to update the version.txt file with the current date and time

# Generate version in yyyy.MM.dd.HHmm format
$version = Get-Date -Format "yyyy.MM.dd.HHmm"

# Update version.txt
$versionFile = Join-Path $PSScriptRoot "version.txt"
$version | Out-File -FilePath $versionFile -NoNewline

Write-Host "Version updated to: $version"
