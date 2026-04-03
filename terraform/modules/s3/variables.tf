# AWS S3 module variables

variable "bucket_name" {
  description = "Name of the S3 bucket for test cases"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}
