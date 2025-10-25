#!/bin/bash

# Update Mitchell Lambda IAM Policy
# This script only updates the IAM policy without redeploying the Lambda functions

set -e

# Force use of admin profile
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
export AWS_PROFILE=admin

echo "Using AWS Profile: ${AWS_PROFILE}"
aws sts get-caller-identity

# Configuration
AWS_REGION=us-east-1
ROLE_NAME=mitchell-lambda-role

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${BLUE}==>${NC} ${BLUE}Updating IAM Policy for ${ROLE_NAME}${NC}\n"

# S3 access policy
cat > /tmp/s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:GetObject",
      "s3:PutObject",
      "s3:PutObjectAcl",
      "s3:ListBucket"
    ],
    "Resource": [
      "arn:aws:s3:::neuroscience-fiction",
      "arn:aws:s3:::neuroscience-fiction/*"
    ]
  }]
}
EOF

echo -e "${GREEN}[INFO]${NC} Updating inline policy 'mitchell-s3-access'..."
aws iam put-role-policy \
    --role-name ${ROLE_NAME} \
    --policy-name mitchell-s3-access \
    --policy-document file:///tmp/s3-policy.json

echo -e "${GREEN}[INFO]${NC} Fetching updated policy to verify..."
aws iam get-role-policy \
    --role-name ${ROLE_NAME} \
    --policy-name mitchell-s3-access \
    --query 'PolicyDocument' \
    --output json | jq .

echo -e "\n${GREEN}✓${NC} IAM policy updated successfully!"
echo -e "${YELLOW}[NOTE]${NC} Policy changes take effect immediately for new requests."
