output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  value = aws_ecs_cluster.main.arn
}

output "ecs_task_execution_role_arn" {
  value = local.ecs_task_execution_role_arn
}

output "ecs_task_role_arn" {
  value = local.ecs_task_role_arn
}
