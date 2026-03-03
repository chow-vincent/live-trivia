#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Get AWS account and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="${CDK_DEFAULT_REGION:-${AWS_REGION:-us-west-2}}"
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/live-trivia"

# Load Clerk publishable key (required for client build)
if [ -z "${VITE_CLERK_PUBLISHABLE_KEY:-}" ]; then
  ENV_FILE="$REPO_ROOT/packages/client/.env.local"
  if [ -f "$ENV_FILE" ]; then
    VITE_CLERK_PUBLISHABLE_KEY=$(grep VITE_CLERK_PUBLISHABLE_KEY "$ENV_FILE" | cut -d= -f2-)
  fi
fi
if [ -z "${VITE_CLERK_PUBLISHABLE_KEY:-}" ]; then
  echo "Error: VITE_CLERK_PUBLISHABLE_KEY is not set. Set it as an env var or in packages/client/.env.local"
  exit 1
fi

echo "==> Step 1: Set up Python venv and install dependencies"
cd "$SCRIPT_DIR"
if [ ! -d .venv ]; then
  uv venv .venv
fi
uv pip install -r requirements.txt -p .venv/bin/python -q
source .venv/bin/activate

echo "==> Step 2: Deploy foundation stack (ECR + DynamoDB)"
npx cdk deploy LiveTriviaFoundationStack --require-approval never

echo "==> Step 3: Build and push Docker image"
cd "$REPO_ROOT"
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

docker build --platform linux/amd64 --no-cache \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY" \
  -f packages/server/Dockerfile -t live-trivia .
docker tag live-trivia:latest "${ECR_URI}:latest"
docker push "${ECR_URI}:latest"

echo "==> Step 4: Deploy service stack (VPC + ECS + ALB)"
cd "$SCRIPT_DIR"
npx cdk deploy LiveTriviaServiceStack --require-approval never

echo "==> Step 5: Force new ECS deployment"
CLUSTER_ARN=$(aws ecs list-clusters --region "$REGION" --query "clusterArns[?contains(@, 'LiveTrivia')]" --output text)
SERVICE_ARN=$(aws ecs list-services --cluster "$CLUSTER_ARN" --region "$REGION" --query "serviceArns[0]" --output text)

if [ -n "$SERVICE_ARN" ] && [ "$SERVICE_ARN" != "None" ]; then
  aws ecs update-service \
    --cluster "$CLUSTER_ARN" \
    --service "$SERVICE_ARN" \
    --force-new-deployment \
    --region "$REGION" \
    --no-cli-pager
  echo "Deployment triggered."
else
  echo "Warning: Could not find ECS service."
fi

echo ""
echo "==> Done! Your app is live at https://app.hostedtrivia.com"
