# MongoDB Atlas module outputs

output "connection_string" {
  description = "MongoDB Atlas connection string"
  value       = mongodbatlas_cluster.codecourt.connection_strings[0].standard_srv
  sensitive   = true
}

output "cluster_id" {
  description = "MongoDB Atlas cluster ID"
  value       = mongodbatlas_cluster.codecourt.cluster_id
}

output "cluster_name" {
  description = "MongoDB Atlas cluster name"
  value       = mongodbatlas_cluster.codecourt.name
}
