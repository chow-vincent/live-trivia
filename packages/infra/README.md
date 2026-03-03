# Infrastructure — AWS CDK (Python)

Deploys the live-trivia app on AWS using ECS Fargate behind an Application Load Balancer.

## Architecture

```
Internet → ALB (HTTP:80) → ECS Fargate (port 3001) → DynamoDB
                                  ↑
                            ECR (Docker image)
```

ECS Fargate was chosen over App Runner because **App Runner does not support WebSockets**, and this app relies on Socket.IO for real-time game communication.

## CDK Stacks

The infrastructure is split into two stacks so that the ECR repository exists before the ECS service tries to pull an image:

| Stack | Resources | Why separate |
|-------|-----------|-------------|
| `LiveTriviaFoundationStack` | ECR repository, DynamoDB table | Must exist before Docker push |
| `LiveTriviaServiceStack` | VPC, ECS cluster, Fargate service, ALB | Needs a valid image in ECR |

## AWS Resources

| Resource | Config | Notes |
|----------|--------|-------|
| ECR Repository | `live-trivia`, keeps 5 images | Docker image storage |
| DynamoDB Table | `LiveTrivia`, on-demand, TTL enabled | Single-table design, auto-deletes games after 24h |
| VPC | 2 AZs, public subnets only | No NAT Gateway — Fargate tasks use public IPs for outbound |
| ECS Cluster | Fargate-only | |
| Fargate Service | 0.25 vCPU / 0.5 GB, 1 task | Runs the Express + Socket.IO server |
| ALB | Internet-facing, HTTP:80 | Cookie stickiness enabled for Socket.IO |
| CloudWatch Logs | `live-trivia` stream prefix | Container stdout/stderr |

## Cost Estimate

| Service | ~Monthly |
|---------|---------|
| Fargate (0.25 vCPU / 0.5 GB, 24/7) | $9 |
| ALB | $16 |
| DynamoDB (on-demand) | $1-5 |
| **Total** | **~$26-30** |

## Prerequisites

- AWS CLI configured with credentials
- Docker running
- Node.js 22+ and pnpm (for building the app inside Docker)
- Python 3.12+ and [uv](https://github.com/astral-sh/uv) (for CDK)
- CDK CLI: `npm install -g aws-cdk`

## First-Time Setup

Bootstrap CDK for your AWS account and region:

```bash
npx cdk bootstrap aws://<ACCOUNT_ID>/us-west-2
```

Find your account ID with:

```bash
aws sts get-caller-identity --query Account --output text
```

## Deploy

```bash
./deploy.sh
```

This runs 5 steps:
1. Sets up a Python venv (via `uv`) and installs CDK dependencies
2. Deploys the foundation stack (ECR + DynamoDB)
3. Builds the Docker image and pushes to ECR
4. Deploys the service stack (VPC + ECS + ALB) — the image is already in ECR
5. Forces a new ECS deployment to pull the latest image

First deploy takes ~5-10 minutes. Subsequent deploys ~2-3 minutes.

## Tear Down

```bash
source .venv/bin/activate
npx cdk destroy --all
```

This removes all AWS resources. DynamoDB data and ECR images are deleted (both have `removal_policy=DESTROY`).

## Key Design Decisions

**Two stacks**: The ECS service references an ECR image. If deployed in a single stack, the first deploy fails because the image doesn't exist yet. Splitting lets us deploy ECR first, push the image, then deploy the service.

**Public subnets, no NAT Gateway**: Fargate tasks get public IPs for outbound access (ECR pulls, DynamoDB). The ALB still handles all inbound traffic, and security groups block direct access to the container. This saves ~$32/mo compared to a NAT Gateway. Standard for non-sensitive workloads.

**Cookie stickiness on ALB**: Socket.IO negotiates transports via HTTP before upgrading to WebSocket. Stickiness ensures the upgrade request hits the same Fargate task that handled the initial polling request. Required when running multiple tasks.

**Health check grace period (60s)**: Gives the Node.js process time to boot before the ALB starts checking `/health`. Prevents restart loops during deployment.

**CloudWatch logging**: Container stdout/stderr streams to CloudWatch Logs for debugging. View logs in the AWS Console under CloudWatch > Log Groups.

## Manual Operations

### View logs

```bash
aws logs tail /ecs/LiveTriviaServiceStack-Service --follow --region us-west-2
```

### Force redeploy (without code changes)

```bash
CLUSTER=$(aws ecs list-clusters --query "clusterArns[?contains(@, 'LiveTrivia')]" --output text --region us-west-2)
SERVICE=$(aws ecs list-services --cluster "$CLUSTER" --query "serviceArns[0]" --output text --region us-west-2)
aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --force-new-deployment --region us-west-2
```

### Synth only (preview CloudFormation without deploying)

```bash
source .venv/bin/activate
npx cdk synth --all
```
