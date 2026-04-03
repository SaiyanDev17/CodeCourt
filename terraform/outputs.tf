# Terraform outputs

output "s3_bucket_name" {
  description = "Name of the S3 bucket for test cases"
  value       = module.s3.bucket_name
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = module.s3.bucket_arn
}

output "mongodb_connection_string" {
  description = "MongoDB Atlas connection string"
  value       = module.atlas.connection_string
  sensitive   = true
}

output "oke_cluster_endpoint" {
  description = "OKE cluster endpoint"
  value       = module.oke.cluster_endpoint
}

output "oke_kubeconfig_path" {
  description = "Path to OKE kubeconfig"
  value       = module.oke.kubeconfig_path
}
