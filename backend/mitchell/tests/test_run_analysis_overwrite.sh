#!/bin/bash

# Test Mitchell run-analysis overwrite parameter
# Forces fresh computation even if cached results exist

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

echo_test "Testing mitchell-run-analysis overwrite parameter"

# Get function URL
echo_info "Fetching function URL..."
FUNCTION_URL=$(get_function_url "mitchell-run-analysis")
echo_info "URL: ${FUNCTION_URL}"

# Test parameters
BRAIN_SUBJECT=1
YEAR=2022
GROUP_NAME="dopaminemachine"
NUM_VOXELS=500
ZSCORE_BRAINDATA=false
TEST_INDIVIDUAL_FEATURES=false

echo ""
echo_info "Test parameters:"
echo_info "  brain_subject: ${BRAIN_SUBJECT}"
echo_info "  year: ${YEAR}"
echo_info "  group_name: ${GROUP_NAME}"
echo_info "  num_voxels: ${NUM_VOXELS}"
echo_info "  zscore_braindata: ${ZSCORE_BRAINDATA}"
echo_info "  testIndividualFeatures: ${TEST_INDIVIDUAL_FEATURES}"

# First, ensure cached result exists
echo ""
echo_info "==== STEP 1: Ensure cached result exists ===="
echo_info "Sending normal request..."

RESPONSE1=$(curl -s -X POST ${FUNCTION_URL} \
    -H "Content-Type: application/json" \
    -d "{
        \"brain_subject\": ${BRAIN_SUBJECT},
        \"year\": ${YEAR},
        \"group_name\": \"${GROUP_NAME}\",
        \"num_voxels\": ${NUM_VOXELS},
        \"zscore_braindata\": ${ZSCORE_BRAINDATA},
        \"testIndividualFeatures\": ${TEST_INDIVIDUAL_FEATURES}
    }")

ERROR1=$(echo "$RESPONSE1" | jq -r '.error // empty')
if [ -n "$ERROR1" ]; then
    echo_error "First request failed: ${ERROR1}"
    echo "$RESPONSE1" | pretty_json
    exit 1
fi

CACHED1=$(echo "$RESPONSE1" | jq -r '.cached')
TIMESTAMP1=$(echo "$RESPONSE1" | jq -r '.config.timestamp')

echo_info "Cached: ${CACHED1}"
echo_info "Timestamp: ${TIMESTAMP1}"

# Now send request with overwrite=true
echo ""
echo_info "==== STEP 2: Request with overwrite=true ===="
echo_info "Sending overwrite request (this will take ~20 seconds)..."

# Add small delay to ensure timestamps differ
sleep 2

START2=$(date +%s)

RESPONSE2=$(curl -s -X POST ${FUNCTION_URL} \
    -H "Content-Type: application/json" \
    -d "{
        \"brain_subject\": ${BRAIN_SUBJECT},
        \"year\": ${YEAR},
        \"group_name\": \"${GROUP_NAME}\",
        \"num_voxels\": ${NUM_VOXELS},
        \"zscore_braindata\": ${ZSCORE_BRAINDATA},
        \"testIndividualFeatures\": ${TEST_INDIVIDUAL_FEATURES},
        \"overwrite\": true
    }")

END2=$(date +%s)
ELAPSED2=$((END2 - START2))

ERROR2=$(echo "$RESPONSE2" | jq -r '.error // empty')
if [ -n "$ERROR2" ]; then
    echo_error "Overwrite request failed: ${ERROR2}"
    echo "$RESPONSE2" | pretty_json
    exit 1
fi

CACHED2=$(echo "$RESPONSE2" | jq -r '.cached')
TIMESTAMP2=$(echo "$RESPONSE2" | jq -r '.config.timestamp')
ELAPSED_TIME2=$(echo "$RESPONSE2" | jq -r '.summary.elapsed_time')

echo_info "Cached: ${CACHED2}"
echo_info "Timestamp: ${TIMESTAMP2}"
echo_info "Execution time: ${ELAPSED_TIME2}s"
echo_timer "Total elapsed time: ${ELAPSED2}s"

# Validate overwrite behavior
echo ""
echo_info "Validating overwrite behavior..."

if [ "$CACHED2" = "true" ]; then
    echo_error "Overwrite request returned cached result!"
    echo_error "Expected cached=false, got cached=${CACHED2}"
    exit 1
fi

# Timestamps should differ (new computation)
if [ "$TIMESTAMP1" = "$TIMESTAMP2" ]; then
    echo_error "Timestamps are identical - result was not recomputed!"
    echo_error "First: ${TIMESTAMP1}"
    echo_error "Second: ${TIMESTAMP2}"
    exit 1
fi

# Overwrite should take significant time (~20s)
if [ "$ELAPSED2" -lt 10 ]; then
    echo_warn "Overwrite completed very quickly (${ELAPSED2}s). Expected ~20s."
fi

# Results should still be consistent (same accuracy)
BRAIN_PRED1=$(echo "$RESPONSE1" | jq -r '.summary.brain_prediction_encoding_model_combo')
BRAIN_PRED2=$(echo "$RESPONSE2" | jq -r '.summary.brain_prediction_encoding_model_combo')
MIND_READ1=$(echo "$RESPONSE1" | jq -r '.summary.mind_reading_encoding_model_combo')
MIND_READ2=$(echo "$RESPONSE2" | jq -r '.summary.mind_reading_encoding_model_combo')

if [ "$BRAIN_PRED1" != "$BRAIN_PRED2" ]; then
    echo_error "Brain prediction results differ after overwrite!"
    echo_error "Original: ${BRAIN_PRED1}"
    echo_error "Overwritten: ${BRAIN_PRED2}"
    exit 1
fi

if [ "$MIND_READ1" != "$MIND_READ2" ]; then
    echo_error "Mind reading results differ after overwrite!"
    echo_error "Original: ${MIND_READ1}"
    echo_error "Overwritten: ${MIND_READ2}"
    exit 1
fi

# Success
echo ""
echo_success "Overwrite validation passed"
echo_info "Original: cached=${CACHED1}, timestamp=${TIMESTAMP1}"
echo_info "Overwrite: cached=${CACHED2}, timestamp=${TIMESTAMP2}, time=${ELAPSED2}s"
echo ""
echo_info "✅ Test passed!"
