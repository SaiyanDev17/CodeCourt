# Oracle Cloud Kubernetes Engine (OKE) module variables

variable "compartment_id" {
  description = "Oracle Cloud compartment ID"
  type        = string
}

variable "cluster_name" {
  description = "Name of the OKE cluster"
  type        = string
  default     = "codecourt-cluster"
}

variable "node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 2
}

variable "node_shape" {
  description = "Shape of worker nodes"
  type        = string
  default     = "VM.Standard.E4.Flex"
}

variable "vcn_id" {
  description = "VCN ID for the cluster"
  type        = string
  default     = ""
}

variable "service_lb_subnet_id" {
  description = "Service load balancer subnet ID"
  type        = string
  default     = ""
}
