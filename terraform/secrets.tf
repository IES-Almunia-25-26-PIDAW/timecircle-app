# ─────────────────────────────────────────
# AWS Secrets Manager
# ─────────────────────────────────────────

# Database Password Secret
resource "aws_secretsmanager_secret" "db_password" {
  name_prefix             = "${var.project_name}/db-password-"
  description             = "RDS PostgreSQL password for ${var.project_name}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-db-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

# Django Secret Key Secret
resource "aws_secretsmanager_secret" "django_secret_key" {
  name_prefix             = "${var.project_name}/django-secret-key-"
  description             = "Django SECRET_KEY for ${var.project_name}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-django-secret-key"
  }
}

resource "aws_secretsmanager_secret_version" "django_secret_key" {
  secret_id     = aws_secretsmanager_secret.django_secret_key.id
  secret_string = var.django_secret_key
}

# Secret rotation Lambda (Optional - for future enhancement)
# This allows automatic secret rotation every 30 days
