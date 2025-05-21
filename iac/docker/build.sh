#!/bin/bash
# Bash script for building Docker images (Linux/macOS)

# Default values
TAG=""
REGISTRY=""
PUSH=false
IMAGE_NAME="ActiveDirectoryManager"

# If no tag is provided, use the version from version.txt
if [ -z "$TAG" ]; then
  VERSION_FILE="$(dirname "$(dirname "$0")")/version.txt"
  if [ -f "$VERSION_FILE" ]; then
    TAG=$(cat "$VERSION_FILE" | tr -d '[:space:]')
  else
    # If version.txt doesn't exist, use current date/time in yyyy.MM.dd.HHmm format
    TAG=$(date +"%Y.%m.%d.%H%M")
  fi
fi

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tag)
      TAG="$2"
      shift 2
      ;;
    --registry)
      REGISTRY="$2"
      shift 2
      ;;
    --push)
      PUSH=true
      shift
      ;;
    --image-name)
      IMAGE_NAME="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Determine the full image name
if [ -n "$REGISTRY" ]; then
  FULL_IMAGE_NAME="$REGISTRY/$IMAGE_NAME"
else
  FULL_IMAGE_NAME="$IMAGE_NAME"
fi

# Display build information
echo -e "\e[32mBuilding Docker image: $IMAGE_NAME\e[0m"
echo -e "\e[32mTag: $TAG\e[0m"
if [ -n "$REGISTRY" ]; then
  echo -e "\e[32mRegistry: $REGISTRY\e[0m"
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
  echo -e "\e[31mDocker is not available. Please install Docker and try again.\e[0m"
  exit 1
fi

# Build the Docker image
echo -e "\e[36mBuilding image: $FULL_IMAGE_NAME:$TAG\e[0m"

# Navigate to the root directory (two levels up from the script location)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Build the Docker image
if ! docker build -t "$FULL_IMAGE_NAME:$TAG" -f "$(dirname "${BASH_SOURCE[0]}")/Dockerfile" "$ROOT_DIR"; then
  echo -e "\e[31mDocker build failed\e[0m"
  exit 1
fi

echo -e "\e[32mSuccessfully built image: $FULL_IMAGE_NAME:$TAG\e[0m"

# Push the image if requested
if [ "$PUSH" = true ]; then
  echo -e "\e[36mPushing image to registry: $FULL_IMAGE_NAME:$TAG\e[0m"

  if ! docker push "$FULL_IMAGE_NAME:$TAG"; then
    echo -e "\e[31mDocker push failed\e[0m"
    exit 1
  fi

  echo -e "\e[32mSuccessfully pushed image: $FULL_IMAGE_NAME:$TAG\e[0m"
fi
