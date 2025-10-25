#!/bin/bash

# Test Mitchell run-analysis caching behavior
# Runs same analysis twice - second should be cached

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

echo_test "Testing mitchell-run-analysis caching behavior"

# Get function URL
echo_info "Fetching function URL..."
FUNCTION_URL=$(get_function_url "mitchell-run-analysis")
echo_info "URL: ${FUNCTION_URL}"

# Test parameters
BRAIN_SUBJECT=1
YEAR=2001
GROUP_NAME="workshop-2025-01"
NUM_VOXELS=500
ZSCORE_BRAINDATA=true
TEST_INDIVIDUAL_FEATURES=false

PAYLOAD="{
    \"brain_subject\": ${BRAIN_SUBJECT},
    \"year\": ${YEAR},
    \"group_name\": \"${GROUP_NAME}\",
    \"num_voxels\": ${NUM_VOXELS},
    \"zscore_braindata\": ${ZSCORE_BRAINDATA},
    \"testIndividualFeatures\": ${TEST_INDIVIDUAL_FEATURES}
}"

echo ""
echo_info "Test parameters:"
echo_info "  brain_subject: ${BRAIN_SUBJECT}"
echo_info "  year: ${YEAR}"
echo_info "  group_name: ${GROUP_NAME}"
echo_info "  num_voxels: ${NUM_VOXELS}"
echo_info "  zscore_braindata: ${ZSCORE_BRAINDATA}"
echo_info "  testIndividualFeatures: ${TEST_INDIVIDUAL_FEATURES}"

# First request (may be cached or may compute)
echo ""
echo_info "==== FIRST REQUEST ===="
echo_info "Sending request..."
START1=$(date +%s)

RESPONSE1=$(curl -s -X POST ${FUNCTION_URL} \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

END1=$(date +%s)
ELAPSED1=$((END1 - START1))

ERROR1=$(echo "$RESPONSE1" | jq -r '.error // empty')
if [ -n "$ERROR1" ]; then
    echo_error "First request failed: ${ERROR1}"
    echo "$RESPONSE1" | pretty_json
    exit 1
fi

CACHED1=$(echo "$RESPONSE1" | jq -r '.cached')
ELAPSED_TIME1=$(echo "$RESPONSE1" | jq -r '.summary.elapsed_time')

echo_info "Cached: ${CACHED1}"
echo_info "Execution time: ${ELAPSED_TIME1}s"
echo_timer "Total elapsed time: ${ELAPSED1}s"

# Second request (should definitely be cached)
echo ""
echo_info "==== SECOND REQUEST (should be cached) ===="
echo_info "Sending request..."
START2=$(date +%s)

RESPONSE2=$(curl -s -X POST ${FUNCTION_URL} \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

END2=$(date +%s)
ELAPSED2=$((END2 - START2))

ERROR2=$(echo "$RESPONSE2" | jq -r '.error // empty')
if [ -n "$ERROR2" ]; then
    echo_error "Second request failed: ${ERROR2}"
    echo "$RESPONSE2" | pretty_json
    exit 1
fi

CACHED2=$(echo "$RESPONSE2" | jq -r '.cached')
ELAPSED_TIME2=$(echo "$RESPONSE2" | jq -r '.summary.elapsed_time')

echo_info "Cached: ${CACHED2}"
echo_info "Execution time: ${ELAPSED_TIME2}s"
echo_timer "Total elapsed time: ${ELAPSED2}s"

# Validate second request was cached
echo ""
echo_info "Validating caching behavior..."

if [ "$CACHED2" != "true" ]; then
    echo_error "Second request was not cached!"
    echo_error "Expected cached=true, got cached=${CACHED2}"
    exit 1
fi

# Second request should be much faster
if [ "$ELAPSED2" -gt 5 ]; then
    echo_warn "Cached request took ${ELAPSED2}s (expected < 5s)"
fi

# Compare results to ensure consistency
ACCURACY1=$(echo "$RESPONSE1" | jq -r '.summary.total_accuracy')
ACCURACY2=$(echo "$RESPONSE2" | jq -r '.summary.total_accuracy')

if [ "$ACCURACY1" != "$ACCURACY2" ]; then
    echo_error "Results differ between requests!"
    echo_error "First accuracy: ${ACCURACY1}"
    echo_error "Second accuracy: ${ACCURACY2}"
    exit 1
fi

# Success
echo ""
echo_success "Caching validation passed"
echo_info "First request: cached=${CACHED1}, time=${ELAPSED1}s"
echo_info "Second request: cached=${CACHED2}, time=${ELAPSED2}s (${ELAPSED_TIME2}s execution)"
echo ""
echo_info "✅ Test passed!"
