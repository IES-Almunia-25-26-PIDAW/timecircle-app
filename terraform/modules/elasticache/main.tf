# ElastiCache Redis Replication Group (supports encryption and failover)
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id  = "${var.project_name}-${var.environment}-redis"
  description          = "Redis cluster for ${var.project_name}"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.node_type
  num_cache_clusters   = var.num_cache_nodes
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  port                 = 6379

  subnet_group_name          = var.subnet_group_name
  security_group_ids         = [var.redis_security_group_id]
  automatic_failover_enabled = var.automatic_failover_enabled && var.num_cache_nodes > 1

  # Enable automatic backups
  snapshot_retention_limit = 5
  snapshot_window          = "03:00-05:00"

  # Enable at-rest encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = false  # Set to true if using auth tokens

  # CloudWatch logs
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }

  depends_on = [
    aws_elasticache_parameter_group.redis,
    aws_cloudwatch_log_group.redis_slow_log,
    aws_cloudwatch_log_group.redis_engine_log
  ]
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "redis" {
  name   = "${var.project_name}-${var.environment}-redis-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-params"
  }
}

# CloudWatch Log Groups for Redis
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}-slow-log"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-slow-log"
  }
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}-engine-log"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-engine-log"
  }
}
