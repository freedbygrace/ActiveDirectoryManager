# Infrastructure as Code (IaC)

This directory contains all the infrastructure as code configurations for deploying the Active Directory Management application.

## Directory Structure

- **docker/**: Docker-related files
  - `Dockerfile`: Multi-stage Docker build file
  - `docker-compose.yml`: Docker Compose configuration
  - `build.sh`: Bash script for building and pushing Docker images (Linux/macOS)
  - `build.ps1`: PowerShell script for building and pushing Docker images (Windows)
  - `.env`: Environment variables for Docker deployment
  - `.env.example`: Example environment variables
  - `.env.production`: Production environment variables

- **version.txt**: Central version file in yyyy.MM.dd.HHmm format
- **update-version.sh**: Bash script to update version.txt (Linux/macOS)
- **update-version.ps1**: PowerShell script to update version.txt (Windows)
- **update-all.sh**: Comprehensive script to update all version references (Linux/macOS)
- **update-all.ps1**: Comprehensive script to update all version references (Windows)

- **kubernetes/**: Kubernetes manifests
  - `namespace.yaml`: Namespace definition
  - `configmap.yaml`: ConfigMap for non-sensitive configuration
  - `secrets.yaml`: Secrets for sensitive configuration
  - `postgres.yaml`: PostgreSQL StatefulSet and Service
  - `redis.yaml`: Redis StatefulSet and Service
  - `deployment.yaml`: Application Deployment and Service
  - `ingress.yaml`: Ingress for external access
  - `kustomization.yaml`: Kustomize configuration

## Docker

### Versioning

The application uses a versioning scheme in the format `yyyy.MM.dd.HHmm` (year, month, day, hour, minute).

#### Comprehensive Version Update

To update the version and apply it to all components (recommended):

On Linux/macOS:
```bash
# Navigate to the iac directory
cd iac

# Make the script executable
chmod +x update-all.sh

# Update all version references
./update-all.sh
```

On Windows:
```powershell
# Navigate to the iac directory
cd iac

# Update all version references
.\update-all.ps1
```

#### Manual Version Update

To update only the version.txt file:

On Linux/macOS:
```bash
# Navigate to the iac directory
cd iac

# Make the script executable
chmod +x update-version.sh

# Update the version
./update-version.sh
```

On Windows:
```powershell
# Navigate to the iac directory
cd iac

# Update the version
.\update-version.ps1
```

### Building Docker Images

#### Using the build scripts

On Linux/macOS:
```bash
# Navigate to the iac/docker directory
cd iac/docker

# Make the script executable
chmod +x build.sh

# Build the image with version from version.txt
./build.sh

# Build with custom tag
./build.sh --tag 2025.05.21.1430

# Build and push to a registry
./build.sh --registry your-registry.com --push
```

On Windows:
```powershell
# Navigate to the iac/docker directory
cd iac\docker

# Build the image with version from version.txt
.\build.ps1

# Build with custom tag
.\build.ps1 -tag 2025.05.21.1430

# Build and push to a registry
.\build.ps1 -registry your-registry.com -push
```

#### Manually

```bash
# Navigate to the project root
cd /path/to/project

# Get the version from version.txt
VERSION=$(cat iac/version.txt)

# Build the image
docker build -t ActiveDirectoryManager:$VERSION -f iac/docker/Dockerfile .

# Tag the image for a registry
docker tag ActiveDirectoryManager:$VERSION your-registry.com/ActiveDirectoryManager:$VERSION

# Push to registry
docker push your-registry.com/ActiveDirectoryManager:$VERSION
```

### Running with Docker Compose

```bash
# Navigate to the iac/docker directory
cd iac/docker

# Create a .env file from the example if you haven't already
cp .env.example .env
# Edit the .env file with your configuration

# Load the version from version.txt
source .env.version

# Start the application stack
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application stack
docker-compose down
```

## Kubernetes

### Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl configured to communicate with your cluster
- Kustomize (v4.0+) or kubectl v1.14+ which includes kustomize

### Updating Deployment Version

Before deploying, you should update the Kubernetes deployment to use the current version:

On Linux/macOS:
```bash
# Navigate to the iac/kubernetes directory
cd iac/kubernetes

# Make the script executable
chmod +x update-deployment-version.sh

# Update the deployment version
./update-deployment-version.sh
```

On Windows:
```powershell
# Navigate to the iac/kubernetes directory
cd iac\kubernetes

# Update the deployment version
.\update-deployment-version.ps1
```

### Deployment

```bash
# Navigate to the iac/kubernetes directory
cd iac/kubernetes

# Apply all resources
kubectl apply -k .

# Or from anywhere in the project
kubectl apply -k iac/kubernetes
```

### Customization

To customize the deployment for different environments:

1. Create a new directory for your environment:
   ```bash
   mkdir -p iac/kubernetes/environments/production
   ```

2. Create a kustomization.yaml file that references the base configuration:
   ```yaml
   apiVersion: kustomize.config.k8s.io/v1beta1
   kind: Kustomization

   namespace: ad-management-production

   resources:
     - ../../  # Reference the base configuration

   patches:
     # Add your patches here
   ```

3. Apply the environment-specific configuration:
   ```bash
   kubectl apply -k iac/kubernetes/environments/production
   ```

## CI/CD Integration

The Docker build scripts are designed to be used in CI/CD pipelines. Example integration with GitHub Actions:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build and push Docker image
        run: |
          cd iac/docker
          chmod +x build.sh
          ./build.sh --registry ghcr.io --tag ${{ github.sha }} --push
```
