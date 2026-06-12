variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "node_type" {
  type = string
}

variable "num_cache_nodes" {
  type = number
}

variable "automatic_failover_enabled" {
  type = bool
}

variable "subnet_group_name" {
  type = string
}

variable "redis_security_group_id" {
  type = string
}
