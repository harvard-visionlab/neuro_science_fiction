# Mitchell Brain Prediction Backend - Architecture Documentation

## Overview

This backend implements the Mitchell et al. (2008) brain prediction and mind reading analysis as AWS Lambda functions using containerized Python. The system processes fMRI brain data and semantic feature ratings to predict brain activity patterns and perform "mind reading" by inferring what a person is viewing from their brain activity.

**Status**: ✅ **PHASE 1 COMPLETE** - Core analysis infrastructure deployed and tested

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current Implementation](#current-implementation)
3. [Data Architecture](#data-architecture)
4. [Planned: Automatic Analysis Trigger](#planned-automatic-analysis-trigger)
5. [Deployment](#deployment)
6. [Testing](#testing)
7. [Operations & Monitoring](#operations--monitoring)

---

## Architecture Overview

### Design Philosophy

- **Serverless**: AWS Lambda for compute (no servers to manage)
- **Containerized**: Docker containers for full Python ML stack
- **Cost-effective**: Pay only for compute time used (~$0.009 per analysis)
- **Scalable**: Parallel processing across brain subjects
- **Self-documenting**: Config encoded in S3 paths

### Key Components

1. **Docker Container**: Single image with NumPy, SciPy, scikit-learn, PyTorch, boto3
2. **Lambda Functions**: Multiple handlers in one container (router pattern)
3. **S3 Storage**: Brain data, feature data, analysis results
4. **SQS Queue** (planned): Async analysis job queue
5. **Frontend**: Static HTML/JS that calls Lambda endpoints

---

## Current Implementation

### Container Architecture

**Base Image**: `public.ecr.aws/lambda/python:3.11`

**Handler Pattern**: Single container, multiple function types
- Environment variable `FUNCTION_TYPE` determines which handler runs
- Lazy imports keep cold starts reasonable
- Shared dependencies (numpy, scipy, sklearn, torch)

**Current Handlers**:
- `hello-world`: Health check and dependency testing
- `run-analysis`: Core brain prediction and mind reading analysis

### Lambda Functions

#### 1. mitchell-hello-world

**Purpose**: Test infrastructure and dependencies

**Configuration**:
- Memory: 1024 MB
- Timeout: 180 seconds
- Function URL: Public (CORS enabled)

**Response**:
```json
{
  "message": "Mitchell Brain Prediction - Hello World! 🧠",
  "handler": "hello_world",
  "timestamp": "2025-10-25T03:40:42",
  "tests": {
    "numpy": {"success": true, "version": "1.26.4"},
    "scipy": {"success": true, "version": "1.11.4"},
    "sklearn": {"success": true, "version": "1.3.2"},
    "s3": {"success": true, "status_code": 200}
  },
  "environment": {
    "function_name": "mitchell-hello-world",
    "memory_limit_mb": "1024"
  }
}
```

#### 2. mitchell-run-analysis

**Purpose**: Run brain prediction and mind reading analysis

**Configuration**:
- Memory: 7680 MB (increased from 5120 MB)
- Timeout: 900 seconds (15 minutes max)
- Function URL: Public (CORS enabled)

**Input Parameters**:
```json
{
  "brain_subject": 1,           // 1-9
  "year": 2022,
  "group_name": "dopaminemachine",
  "num_voxels": 500,            // Default: 500, Range: 100-5000
  "zscore_braindata": false,
  "testIndividualFeatures": false,  // true = ~7 min, false = ~2 min
  "overwrite": false            // Skip if results exist
}
```

**Processing**:
1. Check S3 for existing results (caching)
2. Validate config matches cached results
3. Load brain data from public S3 URLs (no auth required)
4. Load feature data from public S3 URLs
5. Run leave-2-out cross-validation (1770 iterations)
6. Compute summary statistics
7. Upload results to S3 with public-read ACL

**Output**:
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
    "timestamp": "2025-10-25T03:45:00",
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

**Performance**:
- Fast mode (`testIndividualFeatures=false`): ~2 minutes
- Full mode (`testIndividualFeatures=true`): ~7 minutes
- Peak memory: ~4.5 GB (hence 7680 MB allocation)

---

## Data Architecture

### S3 Bucket Structure

**Bucket**: `neuroscience-fiction`

```
neuroscience-fiction/
│
├── brain-data/                          # Mitchell fMRI data (public)
│   ├── mitchell2008/
│   │   ├── data-science-P1_converted.mat
│   │   ├── data-science-P2_converted.mat
│   │   └── ... (P3-P9)
│   │
├── feature-data/                        # Semantic feature ratings (public)
│   ├── {year}/
│   │   └── {group_name}/
│   │       └── ratings.mat
│   │
├── feature-ratings/                     # CSV ratings (trigger source)
│   ├── {year}/
│   │   └── {year}_{group}_ratings.csv  ⚡ S3 trigger here
│   │
└── analysis-results/                    # Brain analysis results (public-read)
    └── {year}/
        └── {group_name}/
            └── mind-reading/
                └── n{num_voxels}_z{zscore}/
                    └── brain-subject-{N}/
                        ├── results.csv
                        ├── all_betas.pth
                        ├── config.json
                        └── results_by_feature.csv (optional)
```

### Path Structure (Self-Documenting)

Analysis results path encodes configuration:

```
analysis-results/{year}/{group}/mind-reading/n{voxels}_z{zscore}/brain-subject-{N}/
```

**Example**:
```
analysis-results/2022/dopaminemachine/mind-reading/n500_zFalse/brain-subject-1/
```

This means:
- Year: 2022
- Group: dopaminemachine
- Analysis type: mind-reading (brain prediction + mind reading)
- Num voxels: 500
- Z-score brain data: False
- Brain subject: 1

**Why this structure?**
- No database needed - path IS the metadata
- Easy to browse in S3 console
- Clear what each analysis used
- Allows overwriting when changing `testIndividualFeatures` (not in path)

### Result Caching Strategy

**Check before running**:
1. Construct S3 path from config
2. Check if `config.json` exists at path
3. If exists, download and validate:
   - `num_voxels` matches
   - `zscore_braindata` matches
   - `testIndividualFeatures` matches
4. If config matches → return cached results
5. If config differs or missing → run analysis

**Benefits**:
- Saves ~$0.009 per avoided recomputation
- Instant results for repeated requests
- Prevents accidental recomputation

**Overwrite mode**:
- Set `overwrite: true` to force fresh computation
- Useful for testing or if data changed

### Public Access

**Brain data**: Public URLs (no authentication needed)
- Reduces Lambda IAM permissions
- Faster cold starts (no boto3 session for reads)
- Uses `urllib.request.urlretrieve()`

**Results**: Public-read ACL
- Uploaded with `ACL='public-read'`
- Frontend can fetch directly (no presigned URLs)
- Requires `s3:PutObjectAcl` IAM permission

---

## Planned: Automatic Analysis Trigger

### Overview

When students complete feature ratings in the frontend, their CSV is uploaded to S3. This triggers an automatic "complete analysis" across all 9 brain subjects.

### Architecture: S3 → Lambda → SQS → Worker (with Distributed Lock)

```
1. CSV Upload:
   Frontend uploads to:
   s3://neuroscience-fiction/feature-ratings/{year}/{year}_{group}_ratings.csv

2. S3 Event Trigger:
   S3 PutObject event → mitchell-s3-coordinator Lambda

3. Coordinator Logic:
   - Parse year/group from S3 path
   - Create 9 tasks (one per brain subject)
   - Each task config:
     {
       "brain_subject": 1-9,
       "year": 2022,
       "group_name": "dopaminemachine",
       "num_voxels": 500,
       "zscore_braindata": false,
       "testIndividualFeatures": true,
       "s3_feature_path": "feature-ratings/2022/2022_dopaminemachine_ratings.csv"
     }
   - Add to SQS FIFO queue

4. SQS Queue:
   mitchell-analysis-queue (FIFO)
   - ContentBasedDeduplication: 5-minute window
   - Batch size: 3 (process 3 subjects in parallel)
   - Visibility timeout: 1000 seconds (longer than Lambda timeout)

5. Worker Lambda:
   mitchell-run-analysis (modified to support SQS)
   - Receive message from queue
   - Check if results exist → skip if yes
   - Try to acquire S3 lock:
     PUT s3://.../brain-subject-{N}/.processing
     Header: If-None-Match: "*" (atomic operation)
   - If lock acquired → run analysis
   - If lock failed → another worker owns it, skip
   - On completion or error: delete .processing file

6. Lock Cleanup:
   S3 Lifecycle Policy:
   - Auto-delete `.processing` files after 20 minutes
   - Handles crashed workers (timeout = 15 min max)
```

### Deduplication Strategy

**Three layers of protection**:

1. **SQS FIFO Content Deduplication** (5-minute window)
   - Identical messages → deduplicated automatically
   - Handles rapid re-uploads

2. **Worker Result Check**
   - Before processing, check if config.json exists
   - Skip if results already complete

3. **S3 Distributed Lock**
   - Atomic conditional PUT with `If-None-Match: "*"`
   - Only one worker can create .processing file
   - Prevents race condition if two workers start simultaneously

### Components to Implement

#### 1. S3 Event Notification

**Trigger**: `feature-ratings/{year}/*` prefix, PutObject events

**Target**: mitchell-s3-coordinator Lambda

#### 2. Coordinator Lambda (NEW)

**Handler**: `handlers/s3_coordinator.py`

```python
def handler(event, context):
    """
    Triggered by S3 PutObject on feature-ratings/{year}/{year}_{group}_ratings.csv
    Creates 9 analysis tasks (one per brain subject) and adds to SQS
    """
    for record in event['Records']:
        # Parse S3 path
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        # Extract year/group from key
        # feature-ratings/2022/2022_dopaminemachine_ratings.csv
        match = re.match(r'feature-ratings/(\d+)/\d+_(.+)_ratings\.csv', key)
        year = match.group(1)
        group = match.group(2)

        # Check if any results already exist for this year/group
        # (could skip queueing if all 9 subjects complete)

        # Create 9 tasks for all brain subjects
        for brain_subject in range(1, 10):
            message = {
                'brain_subject': brain_subject,
                'year': int(year),
                'group_name': group,
                'num_voxels': 500,
                'zscore_braindata': False,
                'testIndividualFeatures': True,
                's3_feature_path': key
            }

            # Send to SQS FIFO
            sqs.send_message(
                QueueUrl=QUEUE_URL,
                MessageBody=json.dumps(message),
                MessageGroupId=f'{year}_{group}',  # FIFO grouping
                # MessageDeduplicationId auto-generated from content
            )
```

**Configuration**:
- Memory: 256 MB (lightweight)
- Timeout: 60 seconds
- Permissions: `sqs:SendMessage`, `s3:GetObject`

#### 3. SQS FIFO Queue (NEW)

**Name**: `mitchell-analysis-queue.fifo`

**Configuration**:
- FIFO: Yes
- Content-based deduplication: Enabled
- Visibility timeout: 1000 seconds
- Message retention: 4 days
- Dead letter queue: `mitchell-analysis-dlq.fifo` (after 3 retries)

**Cost**: ~$0.40 per 1M requests (negligible)

#### 4. Modified Worker Lambda

**Handler**: `handlers/run_analysis.py` (add SQS support)

```python
def handler(event, context):
    """
    Supports both direct invocation and SQS events
    """
    # Check if invoked via SQS
    if 'Records' in event:
        # SQS batch
        for record in event['Records']:
            process_sqs_message(record)
        return {'statusCode': 200}
    else:
        # Direct invocation (existing behavior)
        return process_direct_invocation(event)

def process_sqs_message(record):
    """Process single SQS message with lock pattern"""
    message = json.loads(record['body'])

    brain_subject = message['brain_subject']
    year = message['year']
    group_name = message['group_name']
    # ... other params

    # 1. Check if results exist
    if results_exist_in_s3(message):
        print(f"✓ Results already exist for subject {brain_subject}, skipping")
        return

    # 2. Try to acquire lock
    lock_key = f"{base_path}/.processing"
    if not acquire_lock(lock_key):
        print(f"⏭ Another worker is processing subject {brain_subject}, skipping")
        return

    try:
        # 3. Run analysis
        print(f"🚀 Starting analysis for subject {brain_subject}")
        run_analysis(message)
    except Exception as e:
        print(f"❌ Error processing subject {brain_subject}: {e}")
        raise  # Let SQS retry
    finally:
        # 4. Always release lock
        release_lock(lock_key)

def acquire_lock(lock_key):
    """Atomically create lock file if it doesn't exist"""
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=lock_key,
            Body=json.dumps({
                'worker_id': context.aws_request_id,
                'timestamp': datetime.utcnow().isoformat()
            }),
            IfNoneMatch='*'  # Only succeed if doesn't exist
        )
        return True  # Lock acquired!
    except s3_client.exceptions.PreconditionFailed:
        return False  # Lock already held by another worker

def release_lock(lock_key):
    """Delete lock file"""
    try:
        s3_client.delete_object(Bucket=S3_BUCKET, Key=lock_key)
    except Exception as e:
        print(f"Warning: Failed to release lock: {e}")
```

**SQS Event Source Mapping**:
- Batch size: 3 (process 3 messages in parallel)
- Max concurrency: 10 (up to 10 Lambda instances)

#### 5. S3 Lifecycle Policy (NEW)

**Purpose**: Auto-cleanup stale lock files

```json
{
  "Rules": [
    {
      "Id": "CleanupProcessingLocks",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "analysis-results/",
        "Tag": {
          "Key": "type",
          "Value": "lock"
        }
      },
      "Expiration": {
        "Days": 1
      },
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 1
      }
    }
  ]
}
```

**Alternative** (simpler, no tags):
- Use S3 Object Expiration on `.processing` files
- Set to 1 day (overkill, but safe)
- More realistically: 20 minutes (longer than 15-min timeout)

---

## Deployment

### Prerequisites

- AWS CLI configured with admin profile
- Docker installed and running
- AWS account with ECR, Lambda, S3 access

### Scripts

#### 1. `deploy.sh` - Full deployment

```bash
./deploy.sh [build|push|deploy|test|urls|full]

# Commands:
# build   - Build Docker image (linux/amd64)
# push    - Push to ECR (creates repo if needed)
# deploy  - Deploy/update Lambda functions
# test    - Test hello-world function
# urls    - Show function URLs
# full    - Do everything (default)
```

**What it does**:
1. Builds Docker image with `--platform linux/amd64`
2. Pushes to ECR (creates repository if needed)
3. Creates IAM role with S3 permissions
4. Creates/updates Lambda functions
5. Creates function URLs with CORS
6. Tests deployment

**Functions deployed**:
- `mitchell-hello-world` (1024 MB, 180s timeout)
- `mitchell-run-analysis` (7680 MB, 900s timeout)

#### 2. `update_iam_policy.sh` - Fast IAM updates

```bash
./update_iam_policy.sh
```

Updates IAM policy without redeploying functions (much faster).

**Current policy**:
```json
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
```

### Container Details

**Dockerfile**:
```dockerfile
FROM public.ecr.aws/lambda/python:3.11

# Copy requirements and install
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application code
COPY lambda_function.py .
COPY handlers/ handlers/
COPY shared/ shared/

# Set Lambda handler
CMD ["lambda_function.handler"]
```

**Dependencies** (`requirements.txt`):
```
numpy==1.26.4
scipy==1.11.4
scikit-learn==1.3.2
pandas==2.1.4
tqdm==4.66.1
Pillow==10.1.0
matplotlib==3.8.2
boto3==1.34.44
torch==2.1.2 --index-url https://download.pytorch.org/whl/cpu
```

**Image size**: ~1.2 GB (within Lambda 10 GB limit)

### IAM Role

**Role name**: `mitchell-lambda-role`

**Attached policies**:
1. `AWSLambdaBasicExecutionRole` (managed) - CloudWatch Logs
2. `mitchell-s3-access` (inline) - S3 operations

**For SQS (planned)**:
- Add `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes`

---

## Testing

### Test Suite

**Location**: `tests/`

**Scripts**:
- `test_hello_world.sh` - Health check
- `test_run_analysis_fast.sh` - Fast mode (~20s)
- `test_run_analysis_full.sh` - Full mode (~7 min)
- `test_run_analysis_cached.sh` - Caching behavior
- `test_run_analysis_overwrite.sh` - Overwrite parameter

**Common utilities**: `tests/common.sh`

### Running Tests

```bash
cd tests

# Quick health check
./test_hello_world.sh

# Test fast analysis
./test_run_analysis_fast.sh

# Test full analysis (takes ~7 minutes)
./test_run_analysis_full.sh

# Test caching
./test_run_analysis_cached.sh

# Test overwrite
./test_run_analysis_overwrite.sh
```

### Test Configuration

All tests use:
- Year: 2022
- Group: dopaminemachine
- Brain subject: 1
- Num voxels: 500
- Z-score: false
- Test individual features: varies by test

### Expected Results

**Fast mode** (`testIndividualFeatures=false`):
- Runtime: ~2 minutes (122 seconds)
- Brain prediction combo: ~0.93
- Mind reading combo: ~0.91
- Files: results.csv (2.5 MB), all_betas.pth (168 MB), config.json

**Full mode** (`testIndividualFeatures=true`):
- Runtime: ~7 minutes (439 seconds)
- Same accuracies as fast mode
- Additional file: results_by_feature.csv

---

## Operations & Monitoring

### CloudWatch Logs

**Log groups**:
- `/aws/lambda/mitchell-hello-world`
- `/aws/lambda/mitchell-run-analysis`

**Retention**: 7 days (default)

### Monitoring

**Key metrics to watch**:
- **Duration**: Should be ~120s (fast) or ~420s (full)
- **Memory usage**: Should peak at ~4-5 GB
- **Errors**: Timeouts, out-of-memory, S3 permission errors
- **Concurrent executions**: Track if hitting account limits

### Cost Monitoring

**Per analysis** (testIndividualFeatures=false):
- Lambda compute: 7680 MB × 122s × $0.0000166667/GB-s = ~$0.016
- Lambda requests: 1 × $0.20/1M = negligible
- S3 storage: ~171 MB × $0.023/GB/month = ~$0.004/month
- S3 requests: negligible
- **Total**: ~$0.016 per fast analysis

**Per analysis** (testIndividualFeatures=true):
- Lambda compute: 7680 MB × 439s × $0.0000166667/GB-s = ~$0.056
- **Total**: ~$0.056 per full analysis

**Monthly estimate** (100 students, 2 analyses each):
- 200 analyses × $0.016 = ~$3.20/month

### Common Issues

#### 1. Timeout (900s exceeded)

**Symptoms**: Lambda stops mid-computation

**Solutions**:
- Check if `testIndividualFeatures=true` (takes 7+ min)
- Verify memory is 7680 MB (higher memory = faster CPU)
- Consider using AWS Batch for longer analyses

#### 2. Out of Memory

**Symptoms**: Lambda killed during processing

**Solutions**:
- Increase memory allocation (currently 7680 MB)
- Check brain data size (should be ~120 MB per subject)
- Monitor CloudWatch Memory Used metric

#### 3. S3 Permission Denied

**Symptoms**: "Access Denied" or "Forbidden"

**Solutions**:
- Run `./update_iam_policy.sh`
- Verify `s3:PutObjectAcl` permission exists
- Check bucket name is correct

#### 4. Cached Results Not Found

**Symptoms**: Runs analysis even though results exist

**Solutions**:
- Verify S3 path structure matches exactly
- Check config.json exists at expected path
- Validate config fields match (num_voxels, zscore, etc.)

---

## Future Enhancements

### Short Term (Next Phase)

1. **Implement SQS architecture**
   - Create coordinator Lambda
   - Set up FIFO queue
   - Add lock pattern to worker
   - Configure S3 event triggers

2. **Additional handlers**
   - `get_results.py` - Retrieve cached results
   - `list_subjects.py` - List available brain subjects
   - `aggregate_results.py` - Cross-subject statistics

3. **Monitoring improvements**
   - CloudWatch Dashboard
   - Cost alerts
   - Error notifications (SNS)

### Long Term

1. **Visualization handlers**
   - `feature_weights_viz.py` - Generate brain slice images
   - 3D brain viewer support

2. **Advanced features**
   - Progress streaming (WebSocket or SSE)
   - Batch analysis (multiple groups)
   - Custom brain data upload

3. **Performance optimization**
   - Cython-compiled analysis code
   - Precomputed brain data embeddings
   - Multi-region deployment

---

## References

- **Original paper**: Mitchell et al. (2008) Science - "Predicting Human Brain Activity Associated with the Meanings of Nouns"
- **Notebook**: `2022/mitchell_feature_modeling_class.ipynb`
- **Frontend**: `sites/mind_reading/` (see CLAUDE.md)
- **AWS Lambda containers**: https://docs.aws.amazon.com/lambda/latest/dg/images-create.html
- **S3 event notifications**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/NotificationHowTo.html
- **SQS FIFO queues**: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html

---

**Last Updated**: 2025-10-25
**Status**: Phase 1 Complete, Phase 2 (SQS) Planned
