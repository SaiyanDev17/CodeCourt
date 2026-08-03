# Root Terraform variables

# AWS General Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# AWS S3 Variables
variable "s3_bucket_name" {
  description = "Name of the S3 bucket for test cases"
  type        = string
  default     = "codecourt-test-cases-bucket"
}

variable "frontend_bucket_name" {
  description = "Name of the S3 bucket for hosting frontend static files"
  type        = string
  default     = "codecourt-frontend-app-bucket"
}


# EKS variables removed for EC2 migration

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

# MongoDB Atlas Variables
variable "atlas_project_id" {
  description = "MongoDB Atlas project ID"
  type        = string
  default     = ""
}

variable "atlas_cluster_name" {
  description = "MongoDB Atlas cluster name"
  type        = string
  default     = "codecourt-cluster"
}

variable "atlas_region" {
  description = "MongoDB Atlas region"
  type        = string
  default     = "US_EAST_1"
}

variable "atlas_instance_size" {
  description = "MongoDB Atlas instance size"
  type        = string
  default     = "M10"
}
