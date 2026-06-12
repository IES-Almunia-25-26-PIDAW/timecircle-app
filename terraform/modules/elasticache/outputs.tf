output "redis_endpoint" {
  value     = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive = true
}

output "redis_address" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  value = aws_elasticache_replication_group.redis.port
}

output "redis_cluster_id" {
  value = aws_elasticache_replication_group.redis.id
}
