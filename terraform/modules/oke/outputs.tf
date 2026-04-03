# OKE module outputs

output "cluster_id" {
  description = "OKE cluster ID"
  value       = oci_containerengine_cluster.codecourt.id
}

output "cluster_endpoint" {
  description = "OKE cluster endpoint"
  value       = oci_containerengine_cluster.codecourt.endpoints[0].public_endpoint
}

output "kubeconfig_path" {
  description = "Path to kubeconfig file"
  value       = "./kubeconfig"
}
