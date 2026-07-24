# =============================================================================
# Compute Module — EC2 + Security Group + IAM + Elastic IP
# =============================================================================
#
# This module provisions a single EC2 instance that runs the entire CodeCourt
# stack via Docker Compose. It includes:
#
#   1. Security Group  — Firewall rules (SSH, HTTP, HTTPS)
#   2. SSH Key Pair     — For remote access
#   3. IAM Role         — EC2 can read S3 test cases without hardcoded keys
#   4. EC2 Instance     — Runs Docker Compose with all services
#   5. Elastic IP       — Fixed public IP ($0 when attached to running instance)
#
# Architecture:
#   Caddy (reverse proxy + auto-HTTPS)
#     → Next.js frontend (:3000)
#     → Express backend (:5000) + Socket.io
#     → FastAPI AI service (:8000)
#   Redis (caching + BullMQ message queue)
#   Judge sandboxes (Docker-in-Docker, spawned on demand)
#
# =============================================================================

# --- SSH Key Pair ---
resource "aws_key_pair" "codecourt" {
  key_name   = "codecourt-${var.environment}"
  public_key = var.ssh_public_key

  tags = {
    Name    = "codecourt-${var.environment}-key"
    Project = "codecourt"
  }
}

# --- Security Group ---
resource "aws_security_group" "codecourt" {
  name        = "codecourt-${var.environment}-sg"
  description = "CodeCourt EC2 - SSH, HTTP, HTTPS inbound; all outbound"

  # SSH access (restricted to allowed CIDR)
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # HTTP (Caddy listens here, redirects to HTTPS if domain configured)
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS (Caddy auto-provisions Let's Encrypt certificates)
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic (Docker pulls, npm install, Atlas connection, etc.)
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "codecourt-${var.environment}-sg"
    Environment = var.environment
    Project     = "codecourt"
  }
}

# --- IAM Role (allows EC2 to read S3 test cases without hardcoded keys) ---
resource "aws_iam_role" "codecourt_ec2" {
  name = "codecourt-${var.environment}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = {
    Name    = "codecourt-${var.environment}-ec2-role"
    Project = "codecourt"
  }
}

# S3 read-only policy scoped to the test cases bucket
resource "aws_iam_role_policy" "s3_read" {
  name = "codecourt-s3-read"
  role = aws_iam_role.codecourt_ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:ListBucket"
      ]
      Resource = [
        var.s3_bucket_arn,
        "${var.s3_bucket_arn}/*"
      ]
    }]
  })
}

resource "aws_iam_instance_profile" "codecourt" {
  name = "codecourt-${var.environment}-profile"
  role = aws_iam_role.codecourt_ec2.name

  tags = {
    Name    = "codecourt-${var.environment}-profile"
    Project = "codecourt"
  }
}

# --- Data Source: Latest Amazon Linux 2023 AMI ---
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

# --- EC2 Instance ---
resource "aws_instance" "codecourt" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.codecourt.key_name
  vpc_security_group_ids = [aws_security_group.codecourt.id]
  iam_instance_profile   = aws_iam_instance_profile.codecourt.name

  root_block_device {
    volume_size = 20     # 20 GB (free tier covers 30 GB)
    volume_type = "gp3"  # gp3 is cheaper than gp2 and faster
    encrypted   = true   # Encryption at rest
  }

  # Bootstrap script: installs Docker, clones repo, builds images, starts stack
  user_data = templatefile("${path.module}/user-data.sh", {
    domain_name    = var.domain_name
    s3_bucket_name = var.s3_bucket_name
  })

  tags = {
    Name        = "codecourt-${var.environment}"
    Environment = var.environment
    Project     = "codecourt"
  }
}

# --- Elastic IP (fixed public IP, $0 when attached to running instance) ---
resource "aws_eip" "codecourt" {
  instance = aws_instance.codecourt.id
  domain   = "vpc"

  tags = {
    Name        = "codecourt-${var.environment}-eip"
    Environment = var.environment
    Project     = "codecourt"
  }
}
