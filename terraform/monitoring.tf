# ─────────────────────────────────────────
# CloudWatch Monitoring and Alarms
# ─────────────────────────────────────────

# SNS Topic for Alarms
resource "aws_sns_topic" "alarms" {
  name = "${var.project_name}-${var.environment}-alarms"

  tags = {
    Name = "${var.project_name}-alarms-topic"
  }
}

# SNS Topic Subscription (replace with your email)
resource "aws_sns_topic_subscription" "alarms_email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = "admin@timecircle.local"  # CHANGE THIS TO YOUR EMAIL
}

# ─────────────────────────────────────────
# RDS Alarms
# ─────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "rds_cpu_utilization" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Alert when RDS CPU utilization is high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = module.rds.rds_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_database_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Alert when RDS connections are high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = module.rds.rds_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_free_storage" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "2147483648"  # 2 GB in bytes
  alarm_description   = "Alert when RDS free storage is low (< 2 GB)"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = module.rds.rds_identifier
  }
}

# ─────────────────────────────────────────
# ECS Alarms
# ─────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "ecs_backend_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-backend-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "Alert when backend ECS CPU is high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = module.ecs.cluster_name
    ServiceName = aws_ecs_service.backend.name
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_backend_memory" {
  alarm_name          = "${var.project_name}-${var.environment}-backend-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "Alert when backend ECS memory is high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = module.ecs.cluster_name
    ServiceName = aws_ecs_service.backend.name
  }
}

# ─────────────────────────────────────────
# CloudWatch Dashboard
# ─────────────────────────────────────────

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      # RDS Metrics
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", { stat = "Average" }],
            [".", "DatabaseConnections", { stat = "Average" }],
            [".", "FreeStorageSpace", { stat = "Average" }],
            [".", "ReadLatency", { stat = "Average" }],
            [".", "WriteLatency", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS PostgreSQL Metrics"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      # ElastiCache Metrics
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", { stat = "Average" }],
            [".", "NetworkBytesIn", { stat = "Sum" }],
            [".", "NetworkBytesOut", { stat = "Sum" }],
            [".", "EngineCPUUtilization", { stat = "Average" }],
            [".", "Evictions", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ElastiCache Redis Metrics"
        }
      },
      # ECS Backend Service
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average" }],
            [".", "MemoryUtilization", { stat = "Average" }],
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average" }],
            [".", "RequestCount", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS & ALB Metrics"
        }
      }
    ]
  })
}

# ─────────────────────────────────────────
# Log Insights Queries (stored as reference)
# ─────────────────────────────────────────

# CloudWatch Logs Insights query examples:
# fields @timestamp, @message, @duration | filter ispresent(@duration) | stats avg(@duration) by bin(5m)
# fields @timestamp, @message | filter @message like /ERROR/ | stats count() by @message
# fields @timestamp, container, @message | filter container = "backend" | stats count() as error_count
