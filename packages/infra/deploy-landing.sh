#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STACK_NAME="LiveTriviaLandingStack"

echo "==> Step 1: Set up Python venv and install dependencies"
cd "$SCRIPT_DIR"
if [ ! -d .venv ]; then
  uv venv .venv
fi
uv pip install -r requirements.txt -p .venv/bin/python -q
source .venv/bin/activate

echo "==> Step 2: Deploy landing infrastructure (S3 + CloudFront)"
npx cdk deploy "$STACK_NAME" --require-approval never

echo "==> Step 3: Build landing page"
cd "$REPO_ROOT"
pnpm install --filter @live-trivia/landing --frozen-lockfile
pnpm --filter @live-trivia/landing build
DIST_DIR="$REPO_ROOT/packages/landing/dist"

echo "==> Step 4: Get stack outputs"
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output text)

echo "  Bucket: $BUCKET_NAME"
echo "  Distribution: $DISTRIBUTION_ID"

echo "==> Step 5: Sync assets to S3 (two-pass for zero-downtime)"
# Pass 1: Hashed assets with immutable cache (deploy these first)
aws s3 sync "$DIST_DIR/assets" "s3://${BUCKET_NAME}/assets" \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --region us-east-1

# Pass 2: Everything else (index.html, etc.) with no cache
aws s3 sync "$DIST_DIR" "s3://${BUCKET_NAME}" \
  --delete \
  --exclude "assets/*" \
  --cache-control "public, max-age=0, must-revalidate" \
  --region us-east-1

echo "==> Step 6: Invalidate CloudFront cache"
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/index.html" "/" \
  --no-cli-pager

echo ""
echo "==> Done! Landing page is live at https://hostedtrivia.com"
