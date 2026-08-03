# =============================================================================
# CodeCourt — Root Terraform Variables
# =============================================================================

# AWS General Variables
variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "eu-north-1" # Match existing S3 bucket region
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# AWS S3 Variables
variable "s3_bucket_name" {
  description = "S3 bucket name for test case ZIP storage"
  type        = string
  default     = "codecourt-test-cases-bucket"
}

variable "frontend_bucket_name" {
  description = "Name of the S3 bucket for hosting frontend static files"
  type        = string
  default     = "codecourt-frontend-app-bucket"
}

# AWS Lambda Variables
variable "lambda_function_name" {
  description = "Lambda function name for AI Service"
  type        = string
  default     = "codecourt-ai-service-lambda"
}

variable "ai_service_image_uri" {
  description = "ECR Image URI for the AI Service"
  type        = string
  default     = ""
}

variable "allow_dummy_lambda" {
  description = "Allow deploying a dummy Lambda function if ai_service_image_uri is empty"
  type        = bool
  default     = false
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}

variable "ssh_public_key" {
  description = "SSH public key content for EC2 access (cat ~/.ssh/id_rsa.pub)"
  type        = string
  default     = ""
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH into EC2 (e.g., YOUR_IP/32)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "domain_name" {
  description = "Domain name for HTTPS via Caddy"
  type        = string
  default     = ""
}

variable "atlas_instance_size" {
  description = "MongoDB Atlas instance size"
  type        = string
  default     = "M10"
}
