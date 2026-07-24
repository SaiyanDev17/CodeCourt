# =============================================================================
# Compute Module — Outputs
# =============================================================================

output "instance_id" {
  description = "EC2 instance ID (use with: aws ec2 stop-instances --instance-ids)"
  value       = aws_instance.codecourt.id
}

output "elastic_ip" {
  description = "Elastic IP address (fixed public IP)"
  value       = aws_eip.codecourt.public_ip
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.codecourt.id
}
