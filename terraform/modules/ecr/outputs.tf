output "registry_id" {
  value = aws_ecr_repository.repos[keys(aws_ecr_repository.repos)[0]].registry_id
}

output "repository_urls" {
  value = {
    for name, repo in aws_ecr_repository.repos : name => repo.repository_url
  }
}

output "repository_arns" {
  value = {
    for name, repo in aws_ecr_repository.repos : name => repo.arn
  }
}
