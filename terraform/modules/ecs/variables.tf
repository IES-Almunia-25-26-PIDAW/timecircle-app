variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "availability_zones" {
  type = list(string)
}

variable "use_fargate_spot" {
  type    = bool
  default = true
}
