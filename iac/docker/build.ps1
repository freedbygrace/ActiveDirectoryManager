# PowerShell script for building Docker images (Windows)
param (
    [string]$tag = "",
    [string]$registry = "",
    [switch]$push = $false,
    [string]$imageName = "ActiveDirectoryManager"
)

# If no tag is provided, use the version from version.txt
if (-not $tag) {
    $versionFile = Join-Path (Split-Path $PSScriptRoot) "version.txt"
    if (Test-Path $versionFile) {
        $tag = Get-Content $versionFile -Raw
        $tag = $tag.Trim()
    } else {
        # If version.txt doesn't exist, use current date/time in yyyy.MM.dd.HHmm format
        $tag = Get-Date -Format "yyyy.MM.dd.HHmm"
    }
}

# Set error action preference to stop on any error
$ErrorActionPreference = "Stop"

# Display build information
Write-Host "Building Docker image: $imageName" -ForegroundColor Green
Write-Host "Tag: $tag" -ForegroundColor Green
if ($registry) {
    Write-Host "Registry: $registry" -ForegroundColor Green
}

# Determine the full image name
$fullImageName = if ($registry) { "$registry/$imageName" } else { $imageName }

# Check if Docker is available
try {
    docker --version
}
catch {
    Write-Host "Docker is not available. Please install Docker and try again." -ForegroundColor Red
    exit 1
}

# Build the Docker image
try {
    Write-Host "Building image: $fullImageName`:$tag" -ForegroundColor Cyan

    # Navigate to the root directory (two levels up from the script location)
    $rootDir = (Get-Item $PSScriptRoot).Parent.Parent.FullName

    # Build the Docker image
    docker build -t "$fullImageName`:$tag" -f "$PSScriptRoot/Dockerfile" $rootDir

    if ($LASTEXITCODE -ne 0) {
        throw "Docker build failed with exit code $LASTEXITCODE"
    }

    Write-Host "Successfully built image: $fullImageName`:$tag" -ForegroundColor Green

    # Push the image if requested
    if ($push) {
        Write-Host "Pushing image to registry: $fullImageName`:$tag" -ForegroundColor Cyan
        docker push "$fullImageName`:$tag"

        if ($LASTEXITCODE -ne 0) {
            throw "Docker push failed with exit code $LASTEXITCODE"
        }

        Write-Host "Successfully pushed image: $fullImageName`:$tag" -ForegroundColor Green
    }
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
