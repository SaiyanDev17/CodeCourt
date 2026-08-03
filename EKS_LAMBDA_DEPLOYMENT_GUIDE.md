# CodeCourt AWS EKS & AWS Lambda Deployment Guide

This guide details step-by-step instructions for deploying the **CodeCourt** platform using **Terraform**, **AWS EKS (Elastic Kubernetes Service)** for containerized workloads/judges, and **AWS Lambda + API Gateway** for serverless endpoints.

---

## 🏗️ Architecture Summary

| Component | AWS / Infrastructure Service | Function |
| :--- | :--- | :--- |
| **Backend & Frontend** | **AWS EKS Node Pool** | Express.js API & Next.js UI running inside Kubernetes |
| **AI Service** | **AWS Lambda & API Gateway** | Serverless FastAPI LangChain hint service with Mangum adapter |
| **Judge System** | **AWS EKS (BullMQ Workers)** | Sandboxed execution of C++ & Python submissions |
| **Container Registries** | **AWS ECR** | Secure Docker image repositories for Backend, AI Service, and Judge |
| **Test Case Storage** | **AWS S3** | S3 Bucket storing problem input/output zip test cases |
| **Database & Cache** | **MongoDB Atlas & Redis** | Persistent database & Redis in-memory cache/queue |

---

## 📋 Prerequisites

Ensure you have the following installed on your administrative machine:
1. **Terraform** (`>= 1.7.0`)
2. **AWS CLI** (`v2`) configured with valid credentials (`aws configure`)
3. **Docker** & **Docker Buildx**
4. **kubectl** CLI tool
5. **Node.js 20+** & **Python 3.10+**

---

## 🚀 Step 1: Provision Infrastructure with Terraform

1. Navigate to the `terraform/` directory:
   ```bash
   cd terraform
   ```

2. Initialize Terraform modules:
   ```bash
   terraform init
   ```

3. Validate the Terraform configuration:
   ```bash
   terraform validate
   ```

4. Create `terraform.tfvars` from template:
   ```hcl
   aws_region              = "us-east-1"
   environment             = "production"
   s3_bucket_name          = "codecourt-test-cases-prod"
   eks_cluster_name        = "codecourt-eks"
   eks_node_instance_types = ["t3.medium"]
   eks_desired_node_count  = 2
   lambda_function_name    = "codecourt-ai-service-lambda"
   ```

5. Provision infrastructure:
   ```bash
   terraform apply
   ```
   *Note down the outputs: `ecr_repository_urls`, `eks_cluster_name`, `lambda_api_endpoint`, and `s3_bucket_name`.*

---

## 🐳 Step 2: Build & Push Container Images to AWS ECR

Authenticate Docker CLI with AWS ECR:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

### 1. Backend API Image
```bash
docker build -t <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/codecourt-backend:latest ./backend
docker push <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/codecourt-backend:latest
```

### 2. AI Service Container Image (for AWS Lambda or EKS)
```bash
docker build -t <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/codecourt-ai-service:latest ./ai-service
docker push <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/codecourt-ai-service:latest
```

### 3. Judge Execution Image
```bash
docker build -t <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/codecourt-judge:latest -f ./backend/docker/judges/Dockerfile ./backend
docker push <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/codecourt-judge:latest
```

---

## ⚡ Step 3: Deploy AI Service to AWS Lambda

If deploying AI Service as an ECR Container on AWS Lambda:
```bash
aws lambda update-function-code \
    --function-name codecourt-ai-service-lambda \
    --image-uri <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/codecourt-ai-service:latest
```

Set Environment Variables (Groq API key & CORS):
```bash
aws lambda update-function-configuration \
    --function-name codecourt-ai-service-lambda \
    --environment "Variables={GROQ_API_KEY=your_groq_key_here,FRONTEND_URL=http://your-frontend-url}"
```

---

## ☸️ Step 4: Configure kubectl & Deploy to EKS

1. Configure `kubectl` context to connect to your new AWS EKS Cluster:
   ```bash
   aws eks update-kubeconfig --region us-east-1 --name codecourt-eks
   ```

2. Create `codecourt` namespace:
   ```bash
   kubectl apply -f backend/k8s/namespace.yaml
   ```

3. Deploy Kubernetes Secrets & ConfigMap:
   ```bash
   kubectl apply -f backend/k8s/secrets.example.yaml
   kubectl apply -f backend/k8s/configmap.yaml
   ```

4. Deploy Redis & Backend Services:
   ```bash
   kubectl apply -f backend/k8s/redis-deployment.yaml
   kubectl apply -f backend/k8s/api-deployment.yaml
   ```

5. Deploy EKS AWS ALB Ingress Controller:
   ```bash
   kubectl apply -f backend/k8s/eks-alb-ingress.yaml
   ```

6. Verify status of all pods and ingress:
   ```bash
   kubectl get pods -n codecourt
   kubectl get ingress -n codecourt
   ```

---

## 🔍 Verification & Health Checks

1. **Backend Health Check**:
   ```bash
   curl http://<ALB_ENDPOINT>/health
   ```
2. **Lambda AI Service Endpoint**:
   ```bash
   curl https://<API_GATEWAY_ID>.execute-api.us-east-1.amazonaws.com/health
   ```

---

## 🛠️ Maintenance & Cleanup

To destroy created AWS infrastructure:
```bash
cd terraform
terraform destroy
```
