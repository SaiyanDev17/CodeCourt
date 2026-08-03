# Root Terraform Outputs

output "s3_bucket_name" {
  description = "Name of the S3 bucket for test cases"
  value       = module.s3.bucket_name
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = module.s3.bucket_arn
}

output "ecr_repository_urls" {
  description = "ECR repository URLs for Docker image push"
  value       = module.ecr.repository_urls
}

output "ec2_public_ip" {
  description = "Public IP of the EC2 Instance"
  value       = module.ec2.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of the EC2 Instance"
  value       = module.ec2.public_dns
}

output "lambda_api_endpoint" {
  description = "API Gateway HTTP endpoint for Lambda AI service"
  value       = module.lambda.api_gateway_endpoint
}

output "cloudfront_url" {
  description = "Public HTTPS URL for Frontend CloudFront CDN"
  value       = module.cloudfront.cloudfront_url
}

output "frontend_s3_bucket_name" {
  description = "S3 Bucket Name for uploading frontend static build"
  value       = module.cloudfront.frontend_s3_bucket_name
}
