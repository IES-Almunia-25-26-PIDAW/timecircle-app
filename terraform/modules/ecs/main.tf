# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-cluster"
  }
}

# ECS Cluster Capacity Providers
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = var.use_fargate_spot ? ["FARGATE", "FARGATE_SPOT"] : ["FARGATE"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }

  dynamic "default_capacity_provider_strategy" {
    for_each = var.use_fargate_spot ? [1] : []
    content {
      weight            = 100
      capacity_provider = "FARGATE_SPOT"
    }
  }
}

# CloudWatch Log Group for ECS Cluster
resource "aws_cloudwatch_log_group" "ecs_cluster" {
  name              = "/ecs/${var.project_name}-${var.environment}-cluster"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-cluster-logs"
  }
}

# Data source to reference existing LabRole (for learner labs)
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}

# For learner labs, use the existing LabRole instead of creating new roles
locals {
  ecs_task_execution_role_arn = data.aws_iam_role.lab_role.arn
  ecs_task_role_arn           = data.aws_iam_role.lab_role.arn
}

# Note: S3 access disabled for learner lab (simplified configuration)
