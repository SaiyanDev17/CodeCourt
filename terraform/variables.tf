# =============================================================================
# CodeCourt — Root Terraform Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "eu-north-1" # Match existing S3 bucket region
}

variable "s3_bucket_name" {
  description = "S3 bucket name for test case ZIP storage"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type (t2.micro = free tier eligible)"
  type        = string
  default     = "t2.micro"
}

variable "ssh_public_key" {
  description = "SSH public key content for EC2 access (cat ~/.ssh/id_rsa.pub)"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH into EC2 (e.g., YOUR_IP/32)"
  type        = string
  default     = "0.0.0.0/0" # Restrict to your IP in production
}

variable "domain_name" {
  description = "Domain name for HTTPS via Caddy (leave empty for HTTP-only IP access)"
  type        = string
  default     = ""
}

variable "environment" {
  description = "Environment name (production, staging, dev)"
  type        = string
  default     = "production"
}
