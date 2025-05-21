#!/bin/bash
# Script to update the version.txt file with the current date and time

# Generate version in yyyy.MM.dd.HHmm format
VERSION=$(date +"%Y.%m.%d.%H%M")

# Update version.txt
echo "$VERSION" > "$(dirname "$0")/version.txt"

echo "Version updated to: $VERSION"
