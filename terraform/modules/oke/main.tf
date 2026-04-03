# Oracle Cloud Kubernetes Engine (OKE) cluster configuration

terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}

# This is a placeholder - actual OKE configuration requires VCN, subnets, etc.
# Full implementation will be done in Phase 11

resource "oci_containerengine_cluster" "codecourt" {
  compartment_id     = var.compartment_id
  name               = var.cluster_name
  kubernetes_version = "v1.28.2"
  vcn_id             = var.vcn_id

  options {
    service_lb_subnet_ids = [var.service_lb_subnet_id]
  }
}

resource "oci_containerengine_node_pool" "codecourt" {
  cluster_id         = oci_containerengine_cluster.codecourt.id
  compartment_id     = var.compartment_id
  name               = "${var.cluster_name}-pool"
  kubernetes_version = "v1.28.2"
  node_shape         = var.node_shape

  node_config_details {
    size = var.node_count
  }
}
