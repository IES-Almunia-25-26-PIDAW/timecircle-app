variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "timecircle"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# RDS Configuration
variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  sensitive   = true
}

variable "db_username" {
  description = "PostgreSQL database username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = true
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 1
}

variable "redis_automatic_failover" {
  description = "Enable automatic failover for Redis"
  type        = bool
  default     = true
}

# ECS Configuration
variable "backend_container_memory" {
  description = "Backend container memory in MB"
  type        = number
  default     = 512
}

variable "backend_container_cpu" {
  description = "Backend container CPU units"
  type        = number
  default     = 256
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 2
}

variable "frontend_container_memory" {
  description = "Frontend container memory in MB"
  type        = number
  default     = 256
}

variable "frontend_container_cpu" {
  description = "Frontend container CPU units"
  type        = number
  default     = 128
}

variable "frontend_desired_count" {
  description = "Desired number of frontend tasks"
  type        = number
  default     = 2
}

variable "nginx_container_memory" {
  description = "Nginx container memory in MB"
  type        = number
  default     = 256
}

variable "nginx_container_cpu" {
  description = "Nginx container CPU units"
  type        = number
  default     = 128
}

variable "nginx_desired_count" {
  description = "Desired number of Nginx tasks"
  type        = number
  default     = 2
}

# Django Configuration
variable "django_secret_key" {
  description = "Django SECRET_KEY"
  type        = string
  sensitive   = true
}

variable "django_allowed_hosts" {
  description = "Django ALLOWED_HOSTS"
  type        = list(string)
  default     = ["*"]
}

variable "django_debug" {
  description = "Django DEBUG setting"
  type        = bool
  default     = true
}

# Frontend Configuration
variable "vite_api_url" {
  description = "Vite API URL"
  type        = string
  default     = "http://localhost:8080"
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["http://localhost:3000", "http://localhost:5173"]
}

variable "use_fargate_spot" {
  description = "Use FARGATE_SPOT for cost optimization"
  type        = bool
  default     = true
}

variable "spot_percentage" {
  description = "Percentage of tasks to run on FARGATE_SPOT (0-100)"
  type        = number
  default     = 70
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "TimeCircle"
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}
