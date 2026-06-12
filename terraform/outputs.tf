# VPC Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.rds_endpoint
  sensitive   = true
}

output "rds_address" {
  description = "RDS PostgreSQL address (hostname only)"
  value       = module.rds.rds_address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = module.rds.rds_port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.rds.database_name
  sensitive   = true
}

output "rds_username" {
  description = "RDS master username"
  value       = module.rds.username
  sensitive   = true
}

# ElastiCache Outputs
output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.redis_endpoint
  sensitive   = true
}

output "redis_address" {
  description = "ElastiCache Redis address (hostname only)"
  value       = module.elasticache.redis_address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = module.elasticache.redis_port
}

# ECR Outputs
output "ecr_registry_id" {
  description = "ECR Registry ID"
  value       = module.ecr.registry_id
}

output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value       = module.ecr.repository_urls
}

output "backend_ecr_url" {
  description = "Backend ECR repository URL"
  value       = module.ecr.repository_urls["backend"]
}

output "frontend_ecr_url" {
  description = "Frontend ECR repository URL"
  value       = module.ecr.repository_urls["frontend"]
}

output "nginx_ecr_url" {
  description = "Nginx ECR repository URL"
  value       = module.ecr.repository_urls["nginx"]
}

# ECS Outputs
output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = module.ecs.cluster_arn
}

# ALB Outputs
output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.alb.alb_dns_name
}

output "alb_arn" {
  description = "Application Load Balancer ARN"
  value       = module.alb.alb_arn
}

output "target_group_arn" {
  description = "ALB target group ARN"
  value       = module.alb.target_group_arn
}

# CloudWatch Log Groups
output "cloudwatch_log_groups" {
  description = "CloudWatch log group names"
  value = {
    backend  = aws_cloudwatch_log_group.ecs_backend.name
    frontend = aws_cloudwatch_log_group.ecs_frontend.name
    nginx    = aws_cloudwatch_log_group.ecs_nginx.name
  }
}

# Deployment Information
output "deployment_info" {
  description = "Key deployment information"
  value = {
    region             = var.aws_region
    project            = var.project_name
    environment        = var.environment
    ecs_cluster        = module.ecs.cluster_name
    alb_dns            = module.alb.alb_dns_name
    rds_host           = module.rds.rds_address
    redis_host         = module.elasticache.redis_address
    db_name            = var.db_name
    db_port            = module.rds.rds_port
    redis_port         = module.elasticache.redis_port
  }
  sensitive = true
}
