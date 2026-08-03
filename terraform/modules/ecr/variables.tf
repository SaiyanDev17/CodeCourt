variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "repository_names" {
  description = "List of ECR repository names to create"
  type        = list(string)
  default     = ["codecourt-backend", "codecourt-ai-service", "codecourt-judge"]
}
