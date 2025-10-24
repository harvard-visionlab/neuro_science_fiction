#!/bin/bash

# Deploy Mitchell Brain Prediction Lambda Functions
# Single container, multiple Lambda functions with different FUNCTION_TYPE env vars

set -e

# Force use of admin profile (overrides any env vars in ~/.zshrc)
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
export AWS_PROFILE=admin

echo "Using AWS Profile: ${AWS_PROFILE}"
aws sts get-caller-identity

# Configuration
AWS_REGION=us-east-1
REPO_NAME=mitchell-brain-prediction
ROLE_NAME=mitchell-lambda-role

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:latest"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

function echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

function echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

function echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function echo_step() {
    echo -e "\n${BLUE}==>${NC} ${BLUE}$1${NC}\n"
}

function build() {
    echo_step "Building Docker image..."

    # Use buildx for Lambda-compatible image format
    docker buildx build \
        --platform linux/amd64 \
        --load \
        -t ${REPO_NAME}:latest .

    echo_info "✓ Build complete"
}

function push() {
    echo_step "Pushing to ECR..."

    # Create ECR repository if needed
    if ! aws ecr describe-repositories --repository-names ${REPO_NAME} --region ${AWS_REGION} &> /dev/null; then
        echo_info "Creating ECR repository..."
        aws ecr create-repository \
            --repository-name ${REPO_NAME} \
            --region ${AWS_REGION}
    fi

    # Login
    echo_info "Logging into ECR..."
    aws ecr get-login-password --region ${AWS_REGION} | \
        docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

    # Tag and push
    docker tag ${REPO_NAME}:latest ${IMAGE_URI}
    echo_info "Pushing to ECR (this may take a few minutes)..."
    docker push ${IMAGE_URI}

    echo_info "✓ Push complete"
}

function create_iam_role() {
    echo_step "Setting up IAM role..."

    if aws iam get-role --role-name ${ROLE_NAME} &> /dev/null; then
        echo_warn "Role ${ROLE_NAME} already exists"
        return
    fi

    # Trust policy
    cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

    aws iam create-role \
        --role-name ${ROLE_NAME} \
        --assume-role-policy-document file:///tmp/trust-policy.json

    aws iam attach-role-policy \
        --role-name ${ROLE_NAME} \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

    # S3 access
    cat > /tmp/s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
    "Resource": [
      "arn:aws:s3:::neuroscience-fiction",
      "arn:aws:s3:::neuroscience-fiction/*"
    ]
  }]
}
EOF

    aws iam put-role-policy \
        --role-name ${ROLE_NAME} \
        --policy-name mitchell-s3-access \
        --policy-document file:///tmp/s3-policy.json

    echo_info "✓ IAM role created, waiting 10s for propagation..."
    sleep 10
}

function create_or_update_function() {
    local function_name=$1
    local function_type=$2
    local timeout=${3:-900}
    local memory=${4:-3008}

    echo_info "Deploying ${function_name}..."

    if aws lambda get-function --function-name ${function_name} --region ${AWS_REGION} &> /dev/null; then
        # Update existing
        aws lambda update-function-code \
            --function-name ${function_name} \
            --image-uri ${IMAGE_URI} \
            --region ${AWS_REGION} > /dev/null

        aws lambda update-function-configuration \
            --function-name ${function_name} \
            --timeout ${timeout} \
            --memory-size ${memory} \
            --environment "Variables={FUNCTION_TYPE=${function_type}}" \
            --region ${AWS_REGION} > /dev/null

        echo_info "  ✓ Updated ${function_name}"
    else
        # Create new
        aws lambda create-function \
            --function-name ${function_name} \
            --package-type Image \
            --code ImageUri=${IMAGE_URI} \
            --role arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME} \
            --timeout ${timeout} \
            --memory-size ${memory} \
            --environment "Variables={FUNCTION_TYPE=${function_type}}" \
            --region ${AWS_REGION} > /dev/null

        # Wait for function to be ready (important for large containers)
        echo_info "  Waiting for function to initialize..."
        local max_wait=120
        local waited=0
        while [ $waited -lt $max_wait ]; do
            local status=$(aws lambda get-function-configuration \
                --function-name ${function_name} \
                --region ${AWS_REGION} \
                --query 'LastUpdateStatus' \
                --output text 2>/dev/null || echo "InProgress")

            if [ "$status" = "Successful" ]; then
                break
            fi

            sleep 5
            waited=$((waited + 5))
            echo_info "  Still waiting... (${waited}s)"
        done

        # Create function URL
        aws lambda create-function-url-config \
            --function-name ${function_name} \
            --auth-type NONE \
            --cors '{
                "AllowOrigins": ["*"],
                "AllowMethods": ["GET", "POST"],
                "AllowHeaders": ["Content-Type"],
                "MaxAge": 86400
            }' \
            --region ${AWS_REGION} > /dev/null

        aws lambda add-permission \
            --function-name ${function_name} \
            --statement-id FunctionURLAllowPublicAccess \
            --action lambda:InvokeFunctionUrl \
            --principal "*" \
            --function-url-auth-type NONE \
            --region ${AWS_REGION} > /dev/null

        echo_info "  ✓ Created ${function_name}"
    fi
}

function deploy_functions() {
    echo_step "Deploying Lambda functions..."

    # Function definitions: name, function_type, timeout, memory
    # Format: "function-name|function-type|timeout|memory"

    # Start with just hello-world
    # Format: "function-name|function-type|timeout|memory"
    # Timeout: Higher for 3GB container cold starts (30-90 seconds)
    local functions=(
        "mitchell-hello-world|hello-world|180|1024"
    )

    # TODO: Add these as we implement handlers
    # "mitchell-brain-prediction|brain-prediction|900|3008"
    # "mitchell-mind-reading|mind-reading|900|3008"
    # "mitchell-feature-weights|feature-weights|120|1024"
    # "mitchell-individual-features|individual-features|900|3008"
    # "mitchell-baseline|mitchell-baseline|30|256"
    # "mitchell-feature-prep|feature-prep|60|512"
    # "mitchell-results-aggregator|results-aggregator|60|512"

    for func_config in "${functions[@]}"; do
        IFS='|' read -r func_name func_type timeout memory <<< "$func_config"
        create_or_update_function "$func_name" "$func_type" "$timeout" "$memory"
    done

    echo_info "✓ All functions deployed"
}

function show_urls() {
    echo_step "Function URLs:"

    local functions=(
        "mitchell-hello-world"
    )

    for func_name in "${functions[@]}"; do
        if aws lambda get-function --function-name ${func_name} --region ${AWS_REGION} &> /dev/null; then
            URL=$(aws lambda get-function-url-config \
                --function-name ${func_name} \
                --region ${AWS_REGION} \
                --query 'FunctionUrl' \
                --output text 2>/dev/null || echo "N/A")
            echo_info "${func_name}: ${URL}"
        fi
    done
}

function test() {
    echo_step "Testing hello-world function..."

    FUNCTION_URL=$(aws lambda get-function-url-config \
        --function-name mitchell-hello-world \
        --region ${AWS_REGION} \
        --query 'FunctionUrl' \
        --output text 2>/dev/null)

    if [ -z "$FUNCTION_URL" ] || [ "$FUNCTION_URL" = "None" ]; then
        echo_error "Function URL not found. Deploy first."
        exit 1
    fi

    echo_info "URL: ${FUNCTION_URL}"
    echo_info "Sending test request..."

    curl -s -X POST ${FUNCTION_URL} \
        -H "Content-Type: application/json" \
        -d '{"test": "hello from deploy script"}' \
        | jq .
}

function full_deploy() {
    echo_step "Starting full deployment..."

    build
    push
    create_iam_role
    deploy_functions

    echo_info "Waiting 5s for functions to be ready..."
    sleep 5

    show_urls
    test

    echo ""
    echo_info "🎉 Deployment complete!"
}

# Main
case "${1:-full}" in
    build)
        build
        ;;
    push)
        push
        ;;
    deploy)
        deploy_functions
        ;;
    test)
        test
        ;;
    urls)
        show_urls
        ;;
    full)
        full_deploy
        ;;
    *)
        echo "Usage: $0 [build|push|deploy|test|urls|full]"
        echo ""
        echo "Commands:"
        echo "  build   - Build Docker image"
        echo "  push    - Push image to ECR"
        echo "  deploy  - Deploy/update Lambda functions"
        echo "  test    - Test hello-world function"
        echo "  urls    - Show function URLs"
        echo "  full    - Do everything (default)"
        exit 1
        ;;
esac
