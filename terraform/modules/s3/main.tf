# =============================================================================
# S3 Module — Test Case Storage
# =============================================================================
# Stores hidden test case ZIP files uploaded by problem setters.
# The backend (submission.worker.js) downloads these via the AWS SDK.
# =============================================================================

resource "aws_s3_bucket" "test_cases" {
  bucket = var.bucket_name

  tags = {
    Name        = "CodeCourt Test Cases"
    Environment = var.environment
    Project     = "codecourt"
  }
}

# Block all public access — test cases are private
resource "aws_s3_bucket_public_access_block" "test_cases" {
  bucket                  = aws_s3_bucket.test_cases.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
