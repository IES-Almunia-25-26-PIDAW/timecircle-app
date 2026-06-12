output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_arn" {
  value = aws_lb.main.arn
}

output "alb_zone_id" {
  value = aws_lb.main.zone_id
}

output "target_group_arn" {
  value = aws_lb_target_group.backend.arn
}

output "target_group_backend_arn" {
  value = aws_lb_target_group.backend.arn
}

output "target_group_frontend_arn" {
  value = aws_lb_target_group.frontend.arn
}

output "target_group_name" {
  value = aws_lb_target_group.backend.name
}
