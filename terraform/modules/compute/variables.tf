# =============================================================================
# Compute Module — Variables
# =============================================================================

variable "instance_type" {
  description = "EC2 instance type (t2.micro = free tier, t3.small for 20+ users)"
  type        = string
  default     = "t2.micro"
}

variable "ssh_public_key" {
  description = "SSH public key content for EC2 access"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH into EC2 (e.g., 203.0.113.0/32)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket (passed from S3 module)"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket (passed from S3 module)"
  type        = string
}

variable "domain_name" {
  description = "Domain name for HTTPS via Caddy (empty = HTTP-only)"
  type        = string
  default     = ""
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}
