# Root Terraform configuration for CodeCourt (AWS EC2, S3, ECR, Lambda & CloudFront)

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

# 1. AWS S3 Module (Test Case Storage)
module "s3" {
  source      = "./modules/s3"
  bucket_name = var.s3_bucket_name
  environment = var.environment
}

# 2. AWS ECR Module (Docker Image Registries)
module "ecr" {
  source = "./modules/ecr"

  environment      = var.environment
  repository_names = ["codecourt-backend", "codecourt-ai-service", "codecourt-judge"]
}

# 3. AWS EC2 Module (Single Instance for API & Judge Workers)
module "ec2" {
  source = "./modules/ec2"

  environment   = var.environment
  instance_type = "t3.micro"
}

# 4. AWS Lambda Module (Serverless AI Service Integration)
module "lambda" {
  source = "./modules/lambda"

  function_name      = var.lambda_function_name
  environment        = var.environment
  image_uri          = var.ai_service_image_uri
  allow_dummy_lambda = var.allow_dummy_lambda
  timeout            = 30
  memory_size        = 512
}

# 5. AWS CloudFront + S3 Module (Frontend Global CDN Hosting)
module "cloudfront" {
  source = "./modules/cloudfront"

  bucket_name = var.frontend_bucket_name
  environment = var.environment
}
