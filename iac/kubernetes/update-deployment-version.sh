#!/bin/bash
# Script to update the Kubernetes deployment with the current version

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

# Read the version from version.txt
VERSION_FILE="$PARENT_DIR/version.txt"
if [ ! -f "$VERSION_FILE" ]; then
  echo "Error: version.txt not found at $VERSION_FILE"
  exit 1
fi

VERSION=$(cat "$VERSION_FILE" | tr -d '[:space:]')
echo "Using version: $VERSION"

# Update the deployment.yaml file
DEPLOYMENT_FILE="$SCRIPT_DIR/deployment.yaml"
if [ ! -f "$DEPLOYMENT_FILE" ]; then
  echo "Error: deployment.yaml not found at $DEPLOYMENT_FILE"
  exit 1
fi

# Use sed to replace the image version
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS requires a different sed syntax
  sed -i '' "s|image: ActiveDirectoryManager:[0-9]\{4\}\.[0-9]\{2\}\.[0-9]\{2\}\.[0-9]\{4\}|image: ActiveDirectoryManager:$VERSION|g" "$DEPLOYMENT_FILE"
  sed -i '' "s|image: ActiveDirectoryManager:latest|image: ActiveDirectoryManager:$VERSION|g" "$DEPLOYMENT_FILE"
else
  # Linux
  sed -i "s|image: ActiveDirectoryManager:[0-9]\{4\}\.[0-9]\{2\}\.[0-9]\{2\}\.[0-9]\{4\}|image: ActiveDirectoryManager:$VERSION|g" "$DEPLOYMENT_FILE"
  sed -i "s|image: ActiveDirectoryManager:latest|image: ActiveDirectoryManager:$VERSION|g" "$DEPLOYMENT_FILE"
fi

echo "Updated deployment.yaml with version $VERSION"
