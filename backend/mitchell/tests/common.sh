#!/bin/bash

# Common utilities for Mitchell Lambda tests

set -e

# Force use of admin profile
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
export AWS_PROFILE=admin
AWS_REGION=us-east-1

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

function echo_test() {
    echo -e "\n${BLUE}==>${NC} ${BLUE}$1${NC}\n"
}

function echo_success() {
    echo -e "${GREEN}✓${NC} $1"
}

function echo_timer() {
    echo -e "${CYAN}⏱${NC}  $1"
}

# Get function URL from AWS
function get_function_url() {
    local function_name=$1

    local url=$(aws lambda get-function-url-config \
        --function-name ${function_name} \
        --region ${AWS_REGION} \
        --query 'FunctionUrl' \
        --output text 2>/dev/null)

    if [ -z "$url" ] || [ "$url" = "None" ]; then
        echo_error "Function URL not found for ${function_name}"
        exit 1
    fi

    echo "$url"
}

# Validate JSON response has required fields
function validate_json_field() {
    local json=$1
    local field=$2

    local value=$(echo "$json" | jq -r ".$field")

    if [ "$value" = "null" ] || [ -z "$value" ]; then
        echo_error "Missing required field: $field"
        return 1
    fi

    return 0
}

# Pretty print JSON with syntax highlighting
function pretty_json() {
    jq '.'
}

# Time a command and return elapsed seconds
function time_command() {
    local start=$(date +%s)
    "$@"
    local end=$(date +%s)
    local elapsed=$((end - start))
    echo "$elapsed"
}
