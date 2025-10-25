# Mitchell Lambda Function Tests

Test scripts for Mitchell brain prediction Lambda functions.

## Quick Start

```bash
# Test hello-world
./tests/test_hello_world.sh

# Test run-analysis (fast mode, ~20 seconds)
./tests/test_run_analysis_fast.sh

# Test run-analysis (full mode, ~2 minutes)
./tests/test_run_analysis_full.sh

# Test caching behavior
./tests/test_run_analysis_cached.sh

# Test overwrite parameter
./tests/test_run_analysis_overwrite.sh
```

## Test Scripts

| Script | Description | Duration |
|--------|-------------|----------|
| `test_hello_world.sh` | Tests hello-world endpoint | ~1s |
| `test_run_analysis_fast.sh` | Fast analysis (no individual features) | ~20s |
| `test_run_analysis_full.sh` | Full analysis (with individual features) | ~2min |
| `test_run_analysis_cached.sh` | Tests result caching | ~2s |
| `test_run_analysis_overwrite.sh` | Tests overwrite parameter | ~20s |

## Manual Testing with curl

### Get Function URLs

```bash
# Set AWS profile
export AWS_PROFILE=admin

# Get hello-world URL
aws lambda get-function-url-config \
    --function-name mitchell-hello-world \
    --region us-east-1 \
    --query 'FunctionUrl' \
    --output text

# Get run-analysis URL
aws lambda get-function-url-config \
    --function-name mitchell-run-analysis \
    --region us-east-1 \
    --query 'FunctionUrl' \
    --output text
```

### Test hello-world

```bash
HELLO_URL="<your-function-url>"

curl -X POST ${HELLO_URL} \
    -H "Content-Type: application/json" \
    -d '{"test": "hello from curl"}' \
    | jq .
```

### Test run-analysis (Fast Mode)

```bash
RUN_ANALYSIS_URL="<your-function-url>"

curl -X POST ${RUN_ANALYSIS_URL} \
    -H "Content-Type: application/json" \
    -d '{
        "brain_subject": 1,
        "year": 2001,
        "group_name": "workshop-2025-01",
        "num_voxels": 500,
        "zscore_braindata": true,
        "testIndividualFeatures": false
    }' \
    | jq .
```

### Test run-analysis (Full Mode)

```bash
curl -X POST ${RUN_ANALYSIS_URL} \
    -H "Content-Type: application/json" \
    -d '{
        "brain_subject": 1,
        "year": 2001,
        "group_name": "workshop-2025-01",
        "num_voxels": 500,
        "zscore_braindata": true,
        "testIndividualFeatures": true
    }' \
    | jq .
```

### Test Caching

```bash
# Run once (will compute - may take ~20 seconds)
curl -X POST ${RUN_ANALYSIS_URL} \
    -H "Content-Type: application/json" \
    -d '{
        "brain_subject": 1,
        "year": 2001,
        "group_name": "workshop-2025-01",
        "num_voxels": 500,
        "zscore_braindata": true,
        "testIndividualFeatures": false
    }' \
    | jq .

# Run again immediately (should return cached - ~2 seconds)
curl -X POST ${RUN_ANALYSIS_URL} \
    -H "Content-Type: application/json" \
    -d '{
        "brain_subject": 1,
        "year": 2001,
        "group_name": "workshop-2025-01",
        "num_voxels": 500,
        "zscore_braindata": true,
        "testIndividualFeatures": false
    }' \
    | jq '.cached'
```

### Force Overwrite

```bash
curl -X POST ${RUN_ANALYSIS_URL} \
    -H "Content-Type: application/json" \
    -d '{
        "brain_subject": 1,
        "year": 2001,
        "group_name": "workshop-2025-01",
        "num_voxels": 500,
        "zscore_braindata": true,
        "testIndividualFeatures": false,
        "overwrite": true
    }' \
    | jq .
```

## Expected Response Structure

### hello-world

```json
{
  "message": "Mitchell Brain Prediction - Hello World! 🧠",
  "handler": "hello_world",
  "timestamp": "2025-10-25T03:40:42.142724",
  "input_received": {...},
  "tests": {
    "numpy": {"success": true, ...},
    "scipy": {"success": true, ...},
    "sklearn": {"success": true, ...},
    "s3": {"success": true, ...}
  },
  "environment": {...}
}
```

### run-analysis

```json
{
  "message": "Analysis complete",
  "cached": false,
  "config": {
    "brain_subject": 1,
    "year": 2022,
    "group_name": "dopaminemachine",
    "num_voxels": 500,
    "zscore_braindata": false,
    "testIndividualFeatures": false,
    "num_features": 16,
    "num_iterations": 1770,
    "timestamp": "2025-10-25T03:45:00.123456",
    "elapsed_time": 122.61,
    "s3_path": "s3://neuroscience-fiction/analysis-results/..."
  },
  "summary": {
    "num_iterations": 1770,
    "elapsed_time": 122.61,
    "elapsed_time_minutes": 2.04,
    "brain_prediction_encoding_model_individual": 0.8576,
    "brain_prediction_encoding_model_combo": 0.9316,
    "brain_prediction_botastic_templates_individual": 0.8768,
    "brain_prediction_botastic_templates_combo": 0.9486,
    "mind_reading_encoding_model_individual": 0.8189,
    "mind_reading_encoding_model_combo": 0.9107,
    "mind_reading_botastic_templates_individual": 0.8749,
    "mind_reading_botastic_templates_combo": 0.9395,
    "same_category_accuracy": 0.6667,
    "different_category_accuracy": 0.9509,
    "mean_r2_score": 0.5495
  },
  "s3_urls": {
    "results_csv": "https://neuroscience-fiction.s3.us-east-1.amazonaws.com/.../results.csv",
    "all_betas_pth": "https://neuroscience-fiction.s3.us-east-1.amazonaws.com/.../all_betas.pth",
    "config_json": "https://neuroscience-fiction.s3.us-east-1.amazonaws.com/.../config.json",
    "results_by_feature_csv": "https://... (only if testIndividualFeatures=true)"
  },
  "files": {
    "results_csv_size_mb": 2.55,
    "all_betas_pth_size_mb": 168.32,
    "config_json_size_mb": 0.0
  }
}
```

## Notes

- All test scripts require AWS credentials (AWS_PROFILE=admin)
- Tests automatically fetch function URLs from AWS
- Scripts validate response structure and key fields
- Exit code 0 = success, non-zero = failure
