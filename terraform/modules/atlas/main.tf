# MongoDB Atlas cluster configuration

terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.0"
    }
  }
}

resource "mongodbatlas_cluster" "codecourt" {
  project_id = var.project_id
  name       = var.cluster_name

  provider_name               = "AWS"
  provider_region_name        = var.region
  provider_instance_size_name = var.instance_size

  mongo_db_major_version = "7.0"
  auto_scaling_disk_gb_enabled = true
}

resource "mongodbatlas_project_ip_access_list" "allow_all" {
  project_id = var.project_id
  cidr_block = "0.0.0.0/0"
  comment    = "Allow all IPs (configure properly for production)"
}
