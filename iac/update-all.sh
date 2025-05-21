#!/bin/bash
# Comprehensive script to update version and apply it to all components

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Update version.txt with current date/time
echo "Updating version.txt..."
"$SCRIPT_DIR/update-version.sh"

# Read the new version
VERSION=$(cat "$SCRIPT_DIR/version.txt" | tr -d '[:space:]')
echo "New version: $VERSION"

# Update Kubernetes deployment
echo "Updating Kubernetes deployment..."
"$SCRIPT_DIR/kubernetes/update-deployment-version.sh"

echo "Version update complete. New version: $VERSION"
echo ""
echo "Next steps:"
echo "1. Build Docker image: cd $SCRIPT_DIR/docker && ./build.sh"
echo "2. Push Docker image: cd $SCRIPT_DIR/docker && ./build.sh --push"
echo "3. Deploy to Kubernetes: cd $SCRIPT_DIR/kubernetes && kubectl apply -k ."
