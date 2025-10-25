#!/bin/bash

# Test Mitchell run-analysis Lambda function (FULL mode)
# testIndividualFeatures=true (~2 minutes)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

echo_test "Testing mitchell-run-analysis function (FULL MODE)"
echo_warn "This will take approximately 2 minutes to complete..."

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
TEST_INDIVIDUAL_FEATURES=true

echo ""
echo_info "Test parameters:"
echo_info "  brain_subject: ${BRAIN_SUBJECT}"
echo_info "  year: ${YEAR}"
echo_info "  group_name: ${GROUP_NAME}"
echo_info "  num_voxels: ${NUM_VOXELS}"
echo_info "  zscore_braindata: ${ZSCORE_BRAINDATA}"
echo_info "  testIndividualFeatures: ${TEST_INDIVIDUAL_FEATURES}"

# Send test request
echo ""
echo_info "Sending analysis request (this will take ~2 minutes)..."
START=$(date +%s)

RESPONSE=$(curl -s -X POST ${FUNCTION_URL} \
    -H "Content-Type: application/json" \
    -d "{
        \"brain_subject\": ${BRAIN_SUBJECT},
        \"year\": ${YEAR},
        \"group_name\": \"${GROUP_NAME}\",
        \"num_voxels\": ${NUM_VOXELS},
        \"zscore_braindata\": ${ZSCORE_BRAINDATA},
        \"testIndividualFeatures\": ${TEST_INDIVIDUAL_FEATURES}
    }")

END=$(date +%s)
ELAPSED=$((END - START))

# Pretty print response
echo ""
echo_info "Response:"
echo "$RESPONSE" | pretty_json

# Validate response
echo ""
echo_info "Validating response..."

# Check for error
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')
if [ -n "$ERROR" ]; then
    echo_error "Request failed: ${ERROR}"
    exit 1
fi

# Validate response structure
validate_json_field "$RESPONSE" "message" || exit 1
validate_json_field "$RESPONSE" "config" || exit 1
validate_json_field "$RESPONSE" "summary" || exit 1
validate_json_field "$RESPONSE" "s3_urls" || exit 1

# Check summary fields
CACHED=$(echo "$RESPONSE" | jq -r '.cached')
NUM_ITERATIONS=$(echo "$RESPONSE" | jq -r '.summary.num_iterations')
ELAPSED_TIME=$(echo "$RESPONSE" | jq -r '.summary.elapsed_time')
BRAIN_PRED_COMBO=$(echo "$RESPONSE" | jq -r '.summary.brain_prediction_encoding_model_combo')
MIND_READ_COMBO=$(echo "$RESPONSE" | jq -r '.summary.mind_reading_encoding_model_combo')
MEAN_R2=$(echo "$RESPONSE" | jq -r '.summary.mean_r2_score')

echo ""
echo_info "Results:"
echo_info "  Cached: ${CACHED}"
echo_info "  Iterations: ${NUM_ITERATIONS}"
echo_info "  Brain prediction (combo): ${BRAIN_PRED_COMBO}"
echo_info "  Mind reading (combo): ${MIND_READ_COMBO}"
echo_info "  Mean R² score: ${MEAN_R2}"
echo_info "  Lambda execution time: ${ELAPSED_TIME}s"

# Validate critical values
if [ "$NUM_ITERATIONS" = "null" ] || [ "$NUM_ITERATIONS" = "0" ]; then
    echo_error "Invalid num_iterations: ${NUM_ITERATIONS}"
    exit 1
fi

if [ "$BRAIN_PRED_COMBO" = "null" ]; then
    echo_error "Missing brain_prediction_encoding_model_combo"
    exit 1
fi

if [ "$MIND_READ_COMBO" = "null" ]; then
    echo_error "Missing mind_reading_encoding_model_combo"
    exit 1
fi

# Check S3 URLs (should include results_by_feature.csv for full mode)
RESULTS_CSV=$(echo "$RESPONSE" | jq -r '.s3_urls.results_csv')
RESULTS_BY_FEATURE=$(echo "$RESPONSE" | jq -r '.s3_urls.results_by_feature_csv')
ALL_BETAS=$(echo "$RESPONSE" | jq -r '.s3_urls.all_betas_pth')
CONFIG_JSON=$(echo "$RESPONSE" | jq -r '.s3_urls.config_json')

echo ""
echo_info "S3 URLs:"
echo_info "  results.csv: ${RESULTS_CSV}"
echo_info "  results_by_feature.csv: ${RESULTS_BY_FEATURE}"
echo_info "  all_betas.pth: ${ALL_BETAS}"
echo_info "  config.json: ${CONFIG_JSON}"

# Validate results_by_feature exists for full mode
if [ "$RESULTS_BY_FEATURE" = "null" ]; then
    echo_error "Expected results_by_feature.csv for testIndividualFeatures=true"
    exit 1
fi

# Success
echo ""
echo_success "All validations passed"
echo_timer "Total elapsed time: ${ELAPSED}s"
echo ""
echo_info "✅ Test passed!"
