#!/bin/bash

# Test Mitchell hello-world Lambda function

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

echo_test "Testing mitchell-hello-world function"

# Get function URL
echo_info "Fetching function URL..."
FUNCTION_URL=$(get_function_url "mitchell-hello-world")
echo_info "URL: ${FUNCTION_URL}"

# Send test request
echo_info "Sending test request..."
START=$(date +%s)

RESPONSE=$(curl -s -X POST ${FUNCTION_URL} \
    -H "Content-Type: application/json" \
    -d '{"test": "hello from test script"}')

END=$(date +%s)
ELAPSED=$((END - START))

# Pretty print response
echo_info "Response:"
echo "$RESPONSE" | pretty_json

# Validate response
echo ""
echo_info "Validating response..."

validate_json_field "$RESPONSE" "message" || exit 1
validate_json_field "$RESPONSE" "handler" || exit 1

MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
HANDLER=$(echo "$RESPONSE" | jq -r '.handler')

if [ "$HANDLER" != "hello_world" ]; then
    echo_error "Expected handler 'hello_world', got '${HANDLER}'"
    exit 1
fi

# Check that tests passed
NUMPY_SUCCESS=$(echo "$RESPONSE" | jq -r '.tests.numpy.success')
SCIPY_SUCCESS=$(echo "$RESPONSE" | jq -r '.tests.scipy.success')
SKLEARN_SUCCESS=$(echo "$RESPONSE" | jq -r '.tests.sklearn.success')
S3_SUCCESS=$(echo "$RESPONSE" | jq -r '.tests.s3.success')

if [ "$NUMPY_SUCCESS" != "true" ]; then
    echo_error "NumPy test failed"
    exit 1
fi

if [ "$SCIPY_SUCCESS" != "true" ]; then
    echo_error "SciPy test failed"
    exit 1
fi

if [ "$SKLEARN_SUCCESS" != "true" ]; then
    echo_error "Scikit-learn test failed"
    exit 1
fi

if [ "$S3_SUCCESS" != "true" ]; then
    echo_error "S3 test failed"
    exit 1
fi

# Success
echo ""
echo_success "All validations passed"
echo_timer "Elapsed time: ${ELAPSED}s"
echo ""
echo_info "✅ Test passed!"
