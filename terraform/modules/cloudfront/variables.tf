variable "bucket_name" {
  description = "Name of the S3 bucket for hosting frontend static files"
  type        = string
  default     = "codecourt-frontend-app-bucket"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "eks_lb_domain_name" {
  description = "Domain name of the EKS LoadBalancer backend"
  type        = string
  default     = "a4501ff4c42014180b9ade40891f9dbc-1734134613.us-east-1.elb.amazonaws.com"
}
