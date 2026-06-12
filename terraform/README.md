# Terraform Infrastructure for TimeCircle AWS Deployment

This directory contains Terraform configuration for deploying TimeCircle to AWS using ECS Fargate, RDS PostgreSQL, ElastiCache Redis, and an Application Load Balancer.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Region: us-east-1                    │
├─────────────────────────────────────────────────────────────┤
│                        VPC (10.0.0.0/16)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Public Subnets (ALB, NAT Gateway)            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Private Subnets (ECS, RDS, ElastiCache, Nginx)    │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  ECS Fargate Cluster                          │ │  │
│  │  │  ├─ Backend Service (2 tasks)                 │ │  │
│  │  │  ├─ Frontend Service (2 tasks)                │ │  │
│  │  │  └─ Nginx Service (2 tasks, ALB)             │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  RDS PostgreSQL (Multi-AZ)                    │ │  │
│  │  │  - Automated backups (30 days)                │ │  │
│  │  │  - Enhanced monitoring                        │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  ElastiCache Redis                            │ │  │
│  │  │  - At-rest encryption                         │ │  │
│  │  │  - Automated snapshots                        │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          ↑
    ┌─────┴─────┐
    │    ALB    │
    └─────┬─────┘
          ↓
    Internet (0.0.0.0/0)
```

## Files Description

### Core Configuration
- **main.tf** - Root module configuration, provider setup, and module instantiation
- **variables.tf** - All input variables with descriptions and defaults
- **outputs.tf** - Output values exported after deployment (endpoints, DNS names, etc.)
- **terraform.tfvars** - Variable values (MUST BE CUSTOMIZED before deployment)
- **.gitignore** - Exclude sensitive files and terraform state

### Infrastructure Modules
- **modules/vpc/** - VPC, subnets, Internet Gateway, NAT Gateway, Route Tables
- **modules/security_groups/** - Security groups for ALB, ECS, RDS, Redis
- **modules/rds/** - PostgreSQL RDS instance with automated backups
- **modules/elasticache/** - Redis cluster with encryption and monitoring
- **modules/ecr/** - Container registry repositories for backend, frontend, nginx
- **modules/ecs/** - ECS cluster, task execution roles, CloudWatch logs
- **modules/alb/** - Application Load Balancer, target groups, listeners

### Additional Configuration
- **ecs_tasks_and_services.tf** - Task definitions and ECS services with auto-scaling
- **secrets.tf** - AWS Secrets Manager for sensitive data (DB password, Django secret)
- **monitoring.tf** - CloudWatch alarms, SNS notifications, dashboards

## Quick Start

### 1. Prerequisites

```bash
# Install Terraform
terraform -version  # >= 1.0

# Configure AWS credentials
aws configure
export AWS_REGION=us-east-1

# Verify AWS access
aws sts get-caller-identity
```

### 2. Customize Configuration

```bash
# Copy and edit variables
nano terraform/terraform.tfvars

# REQUIRED CHANGES:
db_password = "GenerateSecurePassword123!"  # Min 16 chars
django_secret_key = "GenerateSecretKey..."   # Min 50 chars using:
# python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 3. Initialize Terraform

```bash
cd terraform
terraform init
```

### 4. Plan Infrastructure

```bash
terraform plan -out=tfplan

# Review the plan carefully
# Check for any errors or unexpected changes
```

### 5. Apply Infrastructure

```bash
terraform apply tfplan

# This will take ~15-20 minutes
# Monitor the progress and wait for completion
```

### 6. Save Outputs

```bash
# Export important values
terraform output -json > ../deployment-outputs.json

# Extract specific values
ALB_DNS=$(terraform output -raw alb_dns_name)
RDS_HOST=$(terraform output -raw rds_address)
REDIS_HOST=$(terraform output -raw redis_address)

echo "ALB DNS: $ALB_DNS"
echo "RDS Host: $RDS_HOST"
echo "Redis Host: $REDIS_HOST"
```

### 7. Build and Push Docker Images

```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

# Build images
BACKEND_ECR=$(terraform output -raw backend_ecr_url)
docker build -t $BACKEND_ECR:latest ../backend/
docker push $BACKEND_ECR:latest

FRONTEND_ECR=$(terraform output -raw frontend_ecr_url)
docker build -t $FRONTEND_ECR:latest ../frontend/
docker push $FRONTEND_ECR:latest

NGINX_ECR=$(terraform output -raw nginx_ecr_url)
docker build -t $NGINX_ECR:latest ../nginx/
docker push $NGINX_ECR:latest
```

### 8. Run Database Migrations

```bash
# Create a temporary ECS task to run migrations
# This requires the backend image to be pushed first

aws ecs run-task \
  --cluster timecircle-production-cluster \
  --task-definition timecircle-backend:1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}" \
  --overrides '{"containerOverrides":[{"name":"backend","command":["python","manage.py","migrate"]}]}' \
  --region us-east-1
```

## Cost Optimization Features

### Already Implemented
- ✅ **FARGATE_SPOT**: 70% of tasks run on FARGATE_SPOT (saves ~70% on compute)
- ✅ **Free Tier**: Using db.t3.micro (RDS) and cache.t3.micro (Redis) - free tier eligible
- ✅ **Automated Cleanup**: Lifecycle policies for ECR images (keep last 10)
- ✅ **Selective Logging**: Only important metrics logged to CloudWatch

### Estimated Monthly Costs (with Free Tier)
- RDS PostgreSQL: **Free** (first year, or $15-30 after)
- ElastiCache Redis: **Free** (first year, or $10-20 after)
- ECS Fargate (70% SPOT): **$5-15**
- ALB: **$15-20**
- NAT Gateway: **$30-50**
- Data Transfer: **$0-10**
- **Total: ~$60-150/month** (or ~$20/month with free tier)

## State Management

### Local State (Development)
By default, Terraform state is stored locally in `terraform/.terraform/`:
```bash
.terraform/
terraform.tfstate
terraform.tfstate.backup
```

### Remote State (Recommended for Production)

Uncomment the backend configuration in `main.tf`:
```hcl
terraform {
  backend "s3" {
    bucket         = "timecircle-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "timecircle-terraform-locks"
  }
}
```

Then:
```bash
# Create S3 bucket and DynamoDB table
aws s3api create-bucket --bucket timecircle-terraform-state --region us-east-1
aws s3api put-bucket-encryption --bucket timecircle-terraform-state \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Create DynamoDB table for locks
aws dynamodb create-table \
  --table-name timecircle-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

# Migrate state
terraform init
```

## Monitoring & Maintenance

### View Deployment Info
```bash
# Get all outputs
terraform output

# View CloudWatch dashboard
aws cloudwatch get-dashboard --dashboard-name timecircle-production-dashboard

# View ECS services
aws ecs describe-services \
  --cluster timecircle-production-cluster \
  --services $(aws ecs list-services --cluster timecircle-production-cluster --query 'serviceArns[*]' --output text)
```

### Check Logs
```bash
# Backend logs
aws logs tail /ecs/timecircle-backend --follow

# Frontend logs
aws logs tail /ecs/timecircle-frontend --follow

# Nginx logs
aws logs tail /ecs/timecircle-nginx --follow
```

### Manual Service Update
```bash
# Update service to latest image
aws ecs update-service \
  --cluster timecircle-production-cluster \
  --service timecircle-backend-service \
  --force-new-deployment \
  --region us-east-1
```

## Cleanup & Destruction

### Warning: This will DELETE ALL RESOURCES

```bash
cd terraform

# Review what will be deleted
terraform plan -destroy

# Delete infrastructure
terraform destroy -auto-approve

# Remove local state
rm -rf .terraform terraform.tfstate*
```

## Troubleshooting

### ECS Tasks not starting
```bash
# Check task logs
aws ecs list-tasks --cluster timecircle-production-cluster
aws ecs describe-tasks --cluster timecircle-production-cluster --tasks <task-arn>

# Check CloudWatch logs
aws logs tail /ecs/timecircle-backend --follow
```

### Database connection issues
```bash
# Test connectivity
psql -h <rds-address> -U timecircle_user -d timecircle_prod

# Check RDS parameter group
aws rds describe-db-instances --db-instance-identifier timecircle-production-db
```

### Redis connection issues
```bash
# Test connectivity
redis-cli -h <redis-address> -p 6379 ping

# Check ElastiCache cluster
aws elasticache describe-cache-clusters --cache-cluster-id timecircle-production-redis
```

## Security Considerations

### Implemented
- ✅ Secrets stored in AWS Secrets Manager (not in terraform state)
- ✅ VPC with private subnets for RDS and Redis
- ✅ Security groups restricting traffic
- ✅ RDS encryption at rest
- ✅ ElastiCache encryption at rest
- ✅ ALB only allows HTTP (upgrade to HTTPS with ACM certificate)
- ✅ Enhanced RDS monitoring enabled

### Recommended Additions
- 🔄 Add ACM certificate for HTTPS
- 🔄 Enable AWS WAF on ALB
- 🔄 Enable VPC Flow Logs
- 🔄 Enable GuardDuty for threat detection
- 🔄 Use VPN for database access
- 🔄 Implement cross-region backup

## Support & Documentation

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Django Deployment on ECS](https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/best_practices.html)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices.html)
