terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment after initial setup to use S3 remote state
  # backend "s3" {
  #   bucket         = "timecircle-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "timecircle-terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.tags
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  project_name           = var.project_name
  environment            = var.environment
  vpc_cidr               = var.vpc_cidr
  public_subnet_cidrs    = var.public_subnet_cidrs
  private_subnet_cidrs   = var.private_subnet_cidrs
  availability_zones     = var.availability_zones
  enable_nat_gateway     = true
  single_nat_gateway     = false # One per AZ for HA
}

# Security Groups Module
module "security_groups" {
  source = "./modules/security_groups"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
}

# RDS Module
module "rds" {
  source = "./modules/rds"

  project_name            = var.project_name
  environment             = var.environment
  db_name                 = var.db_name
  db_username             = var.db_username
  db_password             = var.db_password
  db_instance_class       = var.db_instance_class
  db_allocated_storage    = var.db_allocated_storage
  backup_retention_days   = var.backup_retention_days
  multi_az                = var.multi_az
  subnet_group_name       = aws_db_subnet_group.db.name
  db_security_group_id    = module.security_groups.rds_security_group_id
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYYMMDD-hhmm", timestamp())}"
}

# DB Subnet Group
resource "aws_db_subnet_group" "db" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = module.vpc.private_subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

# ElastiCache Redis Module
module "elasticache" {
  source = "./modules/elasticache"

  project_name                 = var.project_name
  environment                  = var.environment
  node_type                    = var.redis_node_type
  num_cache_nodes              = var.redis_num_cache_nodes
  automatic_failover_enabled   = var.redis_automatic_failover
  subnet_group_name            = aws_elasticache_subnet_group.redis.name
  redis_security_group_id      = module.security_groups.redis_security_group_id
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project_name}-${var.environment}-redis-subnet-group"
  subnet_ids = module.vpc.private_subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-subnet-group"
  }
}

# ECR Module
module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
  
  repositories = [
    "backend",
    "frontend",
    "nginx"
  ]
}

# ECS Module
module "ecs" {
  source = "./modules/ecs"

  project_name             = var.project_name
  environment              = var.environment
  availability_zones       = var.availability_zones
  use_fargate_spot         = var.use_fargate_spot
}

# ALB Module
module "alb" {
  source = "./modules/alb"

  project_name            = var.project_name
  environment             = var.environment
  vpc_id                  = module.vpc.vpc_id
  public_subnet_ids       = module.vpc.public_subnet_ids
  alb_security_group_id   = module.security_groups.alb_security_group_id
}

# S3 Module for Media Files
module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
}

# CloudWatch Logs Groups
resource "aws_cloudwatch_log_group" "ecs_backend" {
  name              = "/ecs/${var.project_name}-backend"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-backend-logs"
  }
}

resource "aws_cloudwatch_log_group" "ecs_frontend" {
  name              = "/ecs/${var.project_name}-frontend"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-frontend-logs"
  }
}

resource "aws_cloudwatch_log_group" "ecs_nginx" {
  name              = "/ecs/${var.project_name}-nginx"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-nginx-logs"
  }
}
