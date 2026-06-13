output "bucket_name" {
  description = "Name of the S3 media bucket"
  value       = aws_s3_bucket.media.id
}

output "bucket_arn" {
  description = "ARN of the S3 media bucket"
  value       = aws_s3_bucket.media.arn
}

output "bucket_region" {
  description = "Region of the S3 media bucket"
  value       = aws_s3_bucket.media.region
}
