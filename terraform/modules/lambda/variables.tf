variable "function_name" {
  description = "Name of the AWS Lambda function"
  type        = string
  default     = "codecourt-ai-service-lambda"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "image_uri" {
  description = "ECR Image URI for container-based Lambda function (optional if using zip)"
  type        = string
  default     = ""
}

variable "allow_dummy_lambda" {
  description = "Allow deploying a dummy Lambda function if image_uri is empty (for dev/testing only)"
  type        = bool
  default     = false
}

variable "handler" {
  description = "Lambda function entry point handler (used if zip package)"
  type        = string
  default     = "app.main.handler"
}

variable "runtime" {
  description = "Runtime environment for Lambda"
  type        = string
  default     = "python3.10"
}

variable "timeout" {
  description = "Function execution timeout in seconds"
  type        = number
  default     = 30
}

variable "memory_size" {
  description = "Memory allocation in MB"
  type        = number
  default     = 512
}

variable "environment_variables" {
  description = "Map of environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}
