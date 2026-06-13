# S3 Bucket for media files (user avatars, etc.)
resource "aws_s3_bucket" "media" {
  bucket = "${var.project_name}-${var.environment}-media-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${var.project_name}-${var.environment}-media"
  }
}

# Block public access - but allow public reads for media
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = false
  ignore_public_acls      = true
  restrict_public_buckets = false
}

# Bucket policy to allow public read access to media files
resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "PublicReadGetObject"
        Effect = "Allow"
        Principal = "*"
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.media.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.media]
}

# Enable versioning for safety
resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle policy to clean up old versions after 90 days
resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

data "aws_caller_identity" "current" {}
