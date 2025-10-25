# Mitchell Backend Handlers

## Overview

This backend uses a **single Docker container** deployed to AWS Lambda, with multiple handler functions routed by `lambda_function.py` based on the `function_type` parameter.

## Handler Architecture

```
lambda_function.py (router)
  ├─> handlers/hello_world.py (testing)
  ├─> handlers/run_analysis.py (main analysis)
  ├─> handlers/get_results.py
  ├─> handlers/list_subjects.py
  ├─> handlers/list_feature_sets.py
  ├─> handlers/validate_features.py
  ├─> handlers/upload_features.py
  ├─> handlers/feature_weights_viz.py
  └─> handlers/aggregate_results.py
```

## Handler Details

### 1. hello_world.py ✅ IMPLEMENTED
**Status**: Complete
**Purpose**: Test infrastructure (numpy, scipy, sklearn, S3 access)
**Memory**: 1024 MB
**Timeout**: 180s

### 2. run_analysis.py ⚠️ PLACEHOLDER
**Purpose**: Run brain prediction and mind reading analysis (1770 iterations)
**Memory**: 5120 MB (based on profiling)
**Timeout**: 900s (15 min max)
**Expected Runtime**: ~1.8 min with testIndividualFeatures=True

**Key Implementation Steps**:
1. Parse input (brain_subject, feature_source, config params)
2. Load brain data using `load_brain_data(brain_subject)`
3. Load feature data using `load_feature_data(year, group_name)` or URL
4. Run `doBrainAndFeaturePrediction()` with progress callback
5. Save results to S3 (public ACL)
6. Return summary + S3 location

**Input**:
```json
{
  "brain_subject": 1,
  "feature_source": "url" or null,
  "year": "2025",
  "group_name": "Testing",
  "num_voxels": 500,
  "zscore_braindata": false,
  "testIndividualFeatures": true,
  "analysis_id": "uuid"
}
```

**Output**:
```json
{
  "results": {...},
  "summary": {
    "accuracy_brain_prediction": 0.93,
    "accuracy_mind_reading": 0.85,
    "elapsed_time": 108.5
  },
  "s3_location": "https://..."
}
```

### 3. get_results.py ⚠️ PLACEHOLDER
**Purpose**: Retrieve previously computed results from S3
**Memory**: 1024 MB
**Timeout**: 30s

**Implementation**: Download JSON from S3, return to client

### 4. list_subjects.py ✅ BASIC IMPLEMENTATION
**Purpose**: List available brain subjects (P1-P9)
**Memory**: 512 MB
**Timeout**: 10s

**Status**: Returns static list, could enhance with S3 metadata

### 5. list_feature_sets.py ✅ BASIC IMPLEMENTATION
**Purpose**: List available feature rating datasets
**Memory**: 512 MB
**Timeout**: 10s

**Status**: Returns static list, needs S3 listing implementation

### 6. validate_features.py ⚠️ PLACEHOLDER
**Purpose**: Validate uploaded feature CSV format
**Memory**: 512 MB
**Timeout**: 30s

**Implementation**:
1. Decode base64 CSV
2. Parse with pandas
3. Validate 60 items, proper columns, rating ranges
4. Return validation errors/warnings

### 7. upload_features.py ⚠️ PLACEHOLDER
**Purpose**: Upload feature CSV to S3
**Memory**: 512 MB
**Timeout**: 30s

**Note**: May use presigned URLs or direct client upload to S3

### 8. feature_weights_viz.py ⚠️ PLACEHOLDER
**Purpose**: Generate brain slice visualizations
**Memory**: 2048 MB
**Timeout**: 120s

**Implementation**:
1. Load betas from results
2. Map to 3D voxel coordinates (51×61×23)
3. Generate 23 PNG slices with matplotlib
4. Upload to S3 or return base64

### 9. aggregate_results.py ⚠️ PLACEHOLDER
**Purpose**: Aggregate results across multiple subjects
**Memory**: 1024 MB
**Timeout**: 60s

**Implementation**:
1. Load results for all subjects
2. Compute cross-subject averages
3. Calculate category-based performance
4. Rank features by accuracy

## Shared Modules

All handlers have access to:
- `shared/brain_data.py` - Load brain data (int, path, or URL)
- `shared/feature_data.py` - Load feature ratings (year/group or path/URL)
- `shared/analysis.py` - Main analysis functions
- `shared/utils.py` - Helper functions (pearson_dist, etc.)

## Next Steps

### Phase 1: Core Analysis (PRIORITY)
1. **Implement `run_analysis.py`** - This is the critical path
   - Add S3 upload for results (public ACL)
   - Add progress tracking/logging
   - Handle errors gracefully

2. **Implement `get_results.py`** - For retrieving cached results
   - Simple S3 download + return

3. **Test end-to-end** - Run analysis, save results, retrieve results

### Phase 2: Data Management
4. **Implement `validate_features.py`** - CSV validation
5. **Implement `upload_features.py`** - S3 upload (or presigned URL)
6. **Enhance `list_feature_sets.py`** - S3 listing instead of static

### Phase 3: Visualization & Aggregation
7. **Implement `feature_weights_viz.py`** - Brain slices
8. **Implement `aggregate_results.py`** - Cross-subject summaries

### Phase 4: Frontend Integration
9. Build HTML/JS frontend in `sites/mind_reading/`
10. Wire up Lambda Function URLs to frontend
11. Add loading states, error handling, result visualization

## Lambda Configuration

**Recommended Settings** (based on profiling):
```
Memory: 5120 MB (2x recommended for headroom)
Timeout: 900 seconds (15 min max)
Ephemeral Storage: 512 MB (default)
```

**Cost Estimate**:
- Per analysis: ~$0.009 (5120 MB × 1.8 min)
- Per 9 subjects: ~$0.08
- Per 100 analyses: ~$0.90

## Deployment

```bash
cd backend/mitchell
./deploy.sh
```

This will:
1. Build Docker image with all dependencies (no boto3!)
2. Push to ECR
3. Update Lambda function
4. Update configuration (memory, timeout)
