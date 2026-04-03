# Root Terraform configuration

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.0"
    }
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "mongodbatlas" {
  # Configure with MONGODB_ATLAS_PUBLIC_KEY and MONGODB_ATLAS_PRIVATE_KEY env vars
}

provider "oci" {
  # Configure with OCI credentials
}

# S3 Module
module "s3" {
  source = "./modules/s3"

  bucket_name = var.s3_bucket_name
  region      = var.aws_region
  environment = var.environment
}

# MongoDB Atlas Module
module "atlas" {
  source = "./modules/atlas"

  project_id    = var.atlas_project_id
  cluster_name  = var.atlas_cluster_name
  region        = var.atlas_region
  instance_size = var.atlas_instance_size
}

# Oracle Cloud Kubernetes Module
module "oke" {
  source = "./modules/oke"

  compartment_id = var.oci_compartment_id
  cluster_name   = var.oke_cluster_name
  node_count     = var.oke_node_count
}
