# =============================================================================
# CodeCourt — Terraform Outputs
# =============================================================================

output "ec2_public_ip" {
  description = "Public Elastic IP of the EC2 instance"
  value       = module.compute.elastic_ip
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/codecourt ec2-user@${module.compute.elastic_ip}"
}

output "app_url" {
  description = "Application URL (HTTPS if domain configured, HTTP otherwise)"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${module.compute.elastic_ip}"
}

output "s3_bucket_name" {
  description = "S3 bucket name for test cases"
  value       = module.s3.bucket_name
}

output "instance_id" {
  description = "EC2 instance ID (for stopping/starting via AWS CLI)"
  value       = module.compute.instance_id
}
