# MongoDB Atlas module variables

variable "project_id" {
  description = "MongoDB Atlas project ID"
  type        = string
}

variable "cluster_name" {
  description = "Name of the MongoDB Atlas cluster"
  type        = string
  default     = "codecourt-cluster"
}

variable "region" {
  description = "MongoDB Atlas region"
  type        = string
  default     = "US_EAST_1"
}

variable "instance_size" {
  description = "MongoDB Atlas instance size"
  type        = string
  default     = "M10"
}
