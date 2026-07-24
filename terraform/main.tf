# =============================================================================
# CodeCourt — Root Terraform Configuration
# =============================================================================
#
# Architecture: Single EC2 instance running Docker Compose
# Resources: EC2 + S3 + Security Group + IAM + Elastic IP
# Cost: $0 (free tier) / ~$10/month (after free tier)
#
# Usage:
#   cp terraform.tfvars.example terraform.tfvars
#   # Edit terraform.tfvars with your values
#   terraform init
#   terraform plan
#   terraform apply
# =============================================================================

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# --- S3 Module: Test case storage ---
module "s3" {
  source      = "./modules/s3"
  bucket_name = var.s3_bucket_name
  environment = var.environment
}

# --- Compute Module: EC2 + Security Group + IAM + Elastic IP ---
module "compute" {
  source           = "./modules/compute"
  instance_type    = var.instance_type
  ssh_public_key   = var.ssh_public_key
  allowed_ssh_cidr = var.allowed_ssh_cidr
  s3_bucket_arn    = module.s3.bucket_arn
  s3_bucket_name   = module.s3.bucket_name
  environment      = var.environment
  domain_name      = var.domain_name
}
