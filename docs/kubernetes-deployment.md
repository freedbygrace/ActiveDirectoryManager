# Kubernetes Deployment Guide

This guide provides detailed instructions for deploying the Active Directory Management application on Kubernetes.

## Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl configured to communicate with your cluster
- [Kustomize](https://kustomize.io/) (v4.0+) or kubectl v1.14+ which includes kustomize
- Optional: Ingress controller (e.g., NGINX Ingress Controller)
- Optional: cert-manager for TLS certificates

## Deployment Architecture

The Kubernetes deployment consists of:

- **Application Deployment**: The main application with multiple replicas
- **PostgreSQL StatefulSet**: Database with persistent storage
- **Redis StatefulSet**: Cache and session storage with persistent storage
- **Services**: For internal communication between components
- **Ingress**: For external access to the application
- **ConfigMap and Secrets**: For configuration and sensitive data

All Kubernetes manifests are located in the `iac/kubernetes/` directory.

## Step-by-Step Deployment

### 1. Customize Configuration

Before deploying, customize the configuration files in the `iac/kubernetes/` directory:

#### ConfigMap (`iac/kubernetes/configmap.yaml`)

Update environment variables according to your environment:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ad-management-config
  namespace: ad-management
data:
  NODE_ENV: "production"
  PORT: "5000"
  BASE_URL: "https://your-domain.com"  # Update this
  DEFAULT_ADMIN_USERNAME: "admin"
  DEFAULT_ADMIN_FULLNAME: "System Administrator"
  DISABLE_REGISTRATION: "false"
  POSTGRES_DB: "admgr"
  POSTGRES_USER: "postgres"
```

#### Secrets (`kubernetes/secrets.yaml`)

Update the secrets with your own base64-encoded values:

```bash
# Generate base64-encoded secrets
echo -n "your-jwt-secret" | base64
echo -n "your-session-secret" | base64
echo -n "your-admin-password" | base64
echo -n "admin@your-domain.com" | base64
echo -n "your-postgres-password" | base64
```

Then update `iac/kubernetes/secrets.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ad-management-secrets
  namespace: ad-management
type: Opaque
data:
  JWT_SECRET: "base64-encoded-jwt-secret"
  SESSION_SECRET: "base64-encoded-session-secret"
  DEFAULT_ADMIN_PASSWORD: "base64-encoded-admin-password"
  DEFAULT_ADMIN_EMAIL: "base64-encoded-admin-email"
  POSTGRES_PASSWORD: "base64-encoded-postgres-password"
```

#### Ingress (`iac/kubernetes/ingress.yaml`)

Update the hostname and TLS configuration:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ad-management-ingress
  namespace: ad-management
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - your-domain.com  # Update this
    secretName: ad-management-tls
  rules:
  - host: your-domain.com  # Update this
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ad-management
            port:
              name: http
```

### 2. Deploy the Application

Deploy all resources using Kustomize:

```bash
# Navigate to the iac/kubernetes directory
cd iac/kubernetes

# Apply all resources
kubectl apply -k .

# Or from anywhere in the project
kubectl apply -k iac/kubernetes
```

### 3. Verify Deployment

Check that all resources are created and running:

```bash
# Check namespace
kubectl get namespace ad-management

# Check pods
kubectl get pods -n ad-management

# Check services
kubectl get services -n ad-management

# Check deployments and statefulsets
kubectl get deployment,statefulset -n ad-management

# Check ingress
kubectl get ingress -n ad-management
```

### 4. Access the Application

If you've configured the Ingress, the application will be available at your specified domain.

Without Ingress, use port-forwarding:

```bash
kubectl port-forward -n ad-management svc/ad-management 5000:80
```

Then access the application at http://localhost:5000.

## Common Operations

### Scaling the Application

To scale the application horizontally:

```bash
kubectl scale -n ad-management deployment/ad-management --replicas=3
```

### Updating the Application

To update the application to a new version:

```bash
# Update the image
kubectl set image -n ad-management deployment/ad-management ad-management=ad-management:new-tag

# Check rollout status
kubectl rollout status -n ad-management deployment/ad-management
```

### Viewing Logs

To view application logs:

```bash
# View logs from all pods
kubectl logs -n ad-management -l app=ad-management

# View logs from a specific pod
kubectl logs -n ad-management pod/ad-management-xxxx-yyyy
```

### Restarting Components

To restart the application:

```bash
kubectl rollout restart -n ad-management deployment/ad-management
```

To restart PostgreSQL or Redis:

```bash
kubectl rollout restart -n ad-management statefulset/postgres
kubectl rollout restart -n ad-management statefulset/redis
```

## Troubleshooting

### Pod Startup Issues

If pods are not starting:

```bash
# Check pod status
kubectl get pods -n ad-management

# Describe the pod for more details
kubectl describe pod -n ad-management pod/ad-management-xxxx-yyyy

# Check container logs
kubectl logs -n ad-management pod/ad-management-xxxx-yyyy
```

### Database Connection Issues

If the application can't connect to the database:

1. Check if the PostgreSQL pod is running:
   ```bash
   kubectl get pods -n ad-management -l app=postgres
   ```

2. Check PostgreSQL logs:
   ```bash
   kubectl logs -n ad-management pod/postgres-0
   ```

3. Verify the connection from the application pod:
   ```bash
   kubectl exec -it -n ad-management pod/ad-management-xxxx-yyyy -- nc -zv postgres 5432
   ```

### Ingress Issues

If the Ingress is not working:

1. Check the Ingress status:
   ```bash
   kubectl describe ingress -n ad-management ad-management-ingress
   ```

2. Check the Ingress controller logs:
   ```bash
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
   ```

## Examples

### Example: Setting Up TLS with cert-manager

1. Install cert-manager:
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.9.1/cert-manager.yaml
   ```

2. Create a ClusterIssuer for Let's Encrypt:
   ```yaml
   apiVersion: cert-manager.io/v1
   kind: ClusterIssuer
   metadata:
     name: letsencrypt-prod
   spec:
     acme:
       server: https://acme-v02.api.letsencrypt.org/directory
       email: your-email@example.com
       privateKeySecretRef:
         name: letsencrypt-prod
       solvers:
       - http01:
           ingress:
             class: nginx
   ```

3. Apply the ClusterIssuer:
   ```bash
   kubectl apply -f cluster-issuer.yaml
   ```

### Example: Setting Up Monitoring with Prometheus and Grafana

1. Install Prometheus Operator:
   ```bash
   kubectl apply -f https://github.com/prometheus-operator/kube-prometheus/releases/download/v0.10.0/manifests-0.10.0.tar.gz
   ```

2. Create a ServiceMonitor for the application:
   ```yaml
   apiVersion: monitoring.coreos.com/v1
   kind: ServiceMonitor
   metadata:
     name: ad-management
     namespace: monitoring
   spec:
     selector:
       matchLabels:
         app: ad-management
     namespaceSelector:
       matchNames:
       - ad-management
     endpoints:
     - port: http
       path: /metrics
       interval: 15s
   ```

3. Apply the ServiceMonitor:
   ```bash
   kubectl apply -f service-monitor.yaml
   ```
