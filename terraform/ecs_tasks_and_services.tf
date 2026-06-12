# ─────────────────────────────────────────
# ECS Task Definitions
# ─────────────────────────────────────────

# Backend Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_container_cpu
  memory                   = var.backend_container_memory
  execution_role_arn       = module.ecs.ecs_task_execution_role_arn
  task_role_arn            = module.ecs.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${module.ecr.repository_urls["backend"]}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "DEBUG"
          value = tostring(var.django_debug)
        },
        {
          name  = "DB_HOST"
          value = module.rds.rds_address
        },
        {
          name  = "DB_PORT"
          value = tostring(module.rds.rds_port)
        },
        {
          name  = "DB_NAME"
          value = var.db_name
        },
        {
          name  = "DB_USER"
          value = var.db_username
        },
        {
          name  = "REDIS_HOST"
          value = module.elasticache.redis_address
        },
        {
          name  = "REDIS_PORT"
          value = tostring(module.elasticache.redis_port)
        },
        {
          name  = "ALLOWED_HOSTS"
          value = join(",", var.django_allowed_hosts)
        },
        {
          name  = "CORS_ALLOWED_ORIGINS"
          value = join(",", var.cors_allowed_origins)
        }
      ]

      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = aws_secretsmanager_secret.db_password.arn
        },
        {
          name      = "SECRET_KEY"
          valueFrom = aws_secretsmanager_secret.django_secret_key.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8000/api/health/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-backend-task"
  }
}

# Frontend Task Definition
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.frontend_container_cpu
  memory                   = var.frontend_container_memory
  execution_role_arn       = module.ecs.ecs_task_execution_role_arn
  task_role_arn            = module.ecs.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${module.ecr.repository_urls["frontend"]}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "VITE_API_URL"
          value = var.vite_api_url
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_frontend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -q -O- http://localhost:3000 || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-frontend-task"
  }
}

# Nginx Task Definition
resource "aws_ecs_task_definition" "nginx" {
  family                   = "${var.project_name}-nginx"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.nginx_container_cpu
  memory                   = var.nginx_container_memory
  execution_role_arn       = module.ecs.ecs_task_execution_role_arn
  task_role_arn            = module.ecs.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name      = "nginx"
      image     = "${module.ecr.repository_urls["nginx"]}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "BACKEND_HOST"
          value = "backend:8000"
        },
        {
          name  = "FRONTEND_HOST"
          value = "frontend:3000"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_nginx.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "nginx"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-nginx-task"
  }
}

# ─────────────────────────────────────────
# ECS Services
# ─────────────────────────────────────────

# Backend Service
# Backend Service (now with ALB - see below)

# Frontend Service with ALB
resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-frontend-service"
  cluster         = module.ecs.cluster_arn
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = var.frontend_desired_count
  launch_type     = "FARGATE"
  platform_version = "LATEST"

  network_configuration {
    subnets          = module.vpc.private_subnet_ids
    security_groups  = [module.security_groups.ecs_tasks_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = module.alb.target_group_frontend_arn
    container_name   = "frontend"
    container_port   = 3000
  }

  depends_on = [
    aws_ecs_task_definition.frontend,
    module.alb
  ]

  tags = {
    Name = "${var.project_name}-frontend-service"
  }
}

# Backend Service with ALB
resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend-service"
  cluster         = module.ecs.cluster_arn
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"
  platform_version = "LATEST"

  network_configuration {
    subnets          = module.vpc.private_subnet_ids
    security_groups  = [module.security_groups.ecs_tasks_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = module.alb.target_group_backend_arn
    container_name   = "backend"
    container_port   = 8000
  }

  depends_on = [
    aws_ecs_task_definition.backend,
    module.alb,
    module.rds,
    module.elasticache
  ]

  tags = {
    Name = "${var.project_name}-backend-service"
  }
}

# Nginx Service (disabled - ALB routes directly to backend)
resource "aws_ecs_service" "nginx" {
  name            = "${var.project_name}-nginx-service"
  cluster         = module.ecs.cluster_arn
  task_definition = aws_ecs_task_definition.nginx.arn
  desired_count   = 0  # Disabled - ALB routes directly to backend
  launch_type     = "FARGATE"
  platform_version = "LATEST"

  network_configuration {
    subnets          = module.vpc.private_subnet_ids
    security_groups  = [module.security_groups.ecs_tasks_security_group_id]
    assign_public_ip = false
  }

  depends_on = [
    aws_ecs_task_definition.nginx
  ]

  tags = {
    Name = "${var.project_name}-nginx-service-disabled"
  }
}

# ─────────────────────────────────────────
# Auto-scaling
# ─────────────────────────────────────────

# Backend Auto-scaling Target
resource "aws_appautoscaling_target" "backend_target" {
  max_capacity       = 4
  min_capacity       = var.backend_desired_count
  resource_id        = "service/${module.ecs.cluster_name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "${var.project_name}-backend-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend_target.resource_id
  scalable_dimension = aws_appautoscaling_target.backend_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend_target.service_namespace
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

resource "aws_appautoscaling_policy" "backend_memory" {
  name               = "${var.project_name}-backend-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend_target.resource_id
  scalable_dimension = aws_appautoscaling_target.backend_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend_target.service_namespace
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 80.0
  }
}

# Nginx Auto-scaling Target
resource "aws_appautoscaling_target" "nginx_target" {
  max_capacity       = 4
  min_capacity       = var.nginx_desired_count
  resource_id        = "service/${module.ecs.cluster_name}/${aws_ecs_service.nginx.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "nginx_cpu" {
  name               = "${var.project_name}-nginx-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.nginx_target.resource_id
  scalable_dimension = aws_appautoscaling_target.nginx_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.nginx_target.service_namespace
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
