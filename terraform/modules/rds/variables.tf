variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_instance_class" {
  type = string
}

variable "db_allocated_storage" {
  type = number
}

variable "backup_retention_days" {
  type = number
}

variable "multi_az" {
  type = bool
}

variable "subnet_group_name" {
  type = string
}

variable "db_security_group_id" {
  type = string
}

variable "skip_final_snapshot" {
  type    = bool
  default = false
}

variable "final_snapshot_identifier" {
  type    = string
  default = null
}
