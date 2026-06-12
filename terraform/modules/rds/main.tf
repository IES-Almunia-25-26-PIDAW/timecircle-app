# RDS PostgreSQL Instance
resource "aws_db_instance" "main" {
  identifier            = "${var.project_name}-${var.environment}-db"
  engine                = "postgres"
  engine_version        = "17.7"
  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  storage_encrypted     = true
  storage_type          = "gp3"

  # Database Configuration
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # Network Configuration
  db_subnet_group_name   = var.subnet_group_name
  vpc_security_group_ids = [var.db_security_group_id]
  publicly_accessible    = false

  # Backup Configuration
  backup_retention_period = var.backup_retention_days
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  copy_tags_to_snapshot  = true

  # High Availability
  multi_az = var.multi_az

  # CloudWatch Logs
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # Snapshot Configuration
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.final_snapshot_identifier

  # Optimize for Django
  parameter_group_name = aws_db_parameter_group.django.name

  # Deletion protection
  deletion_protection = true

  tags = {
    Name = "${var.project_name}-${var.environment}-db"
  }

  depends_on = [aws_db_parameter_group.django]
}

# RDS Parameter Group for Django
resource "aws_db_parameter_group" "django" {
  name   = "${var.project_name}-${var.environment}-postgres-params"
  family = "postgres17"

  parameter {
    name         = "log_statement"
    value        = "all"
    apply_method = "immediate"
  }

  parameter {
    name         = "log_duration"
    value        = "on"
    apply_method = "immediate"
  }

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-postgres-params"
  }
}

# Note: Enhanced monitoring disabled for learner lab (requires IAM role creation permissions)
