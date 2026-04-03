# AWS S3 bucket for test case storage

resource "aws_s3_bucket" "test_cases" {
  bucket = var.bucket_name

  tags = {
    Name        = "CodeCourt Test Cases"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "test_cases" {
  bucket = aws_s3_bucket.test_cases.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "test_cases" {
  bucket = aws_s3_bucket.test_cases.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
