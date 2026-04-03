# Root Terraform variables

# AWS Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for test cases"
  type        = string
}

# MongoDB Atlas Variables
variable "atlas_project_id" {
  description = "MongoDB Atlas project ID"
  type        = string
}

variable "atlas_cluster_name" {
  description = "MongoDB Atlas cluster name"
  type        = string
  default     = "codecourt-cluster"
}

variable "atlas_region" {
  description = "MongoDB Atlas region"
  type        = string
  default     = "US_EAST_1"
}

variable "atlas_instance_size" {
  description = "MongoDB Atlas instance size"
  type        = string
  default     = "M10"
}

# Oracle Cloud Variables
variable "oci_compartment_id" {
  description = "Oracle Cloud compartment ID"
  type        = string
}

variable "oke_cluster_name" {
  description = "OKE cluster name"
  type        = string
  default     = "codecourt-oke"
}

variable "oke_node_count" {
  description = "Number of OKE worker nodes"
  type        = number
  default     = 2
}

# General Variables
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}
