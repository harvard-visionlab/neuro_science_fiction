# Mitchell Brain Prediction Lambda - Production Backend

Single Docker container with multiple Lambda handlers for brain prediction and mind reading analysis.

## Architecture

```
One Container → Multiple Lambda Functions
├── mitchell-hello-world (test infrastructure)
├── mitchell-brain-prediction (coming soon)
├── mitchell-mind-reading (coming soon)
├── mitchell-feature-weights (coming soon)
├── mitchell-individual-features (coming soon)
├── mitchell-baseline (coming soon)
├── mitchell-feature-prep (coming soon)
└── mitchell-results-aggregator (coming soon)
```

Each Lambda function uses the same Docker image but different `FUNCTION_TYPE` environment variable.

## Quick Start

### Deploy Everything

```bash
cd backend/mitchell
./deploy.sh
```

This will:
1. Build Docker image (~5-10 min)
2. Push to ECR (~2-5 min)
3. Create IAM role with S3 access
4. Deploy Lambda function(s)
5. Create Function URL
6. Test hello-world handler

### Expected Output

```json
{
  "message": "Mitchell Brain Prediction - Hello World! 🧠",
  "handler": "hello_world",
  "tests": {
    "numpy": { "version": "1.26.4", "success": true },
    "scipy": { "version": "1.11.4", "success": true },
    "sklearn": { "version": "1.3.2", "success": true },
    "s3": {
      "success": true,
      "bucket": "neuroscience-fiction",
      "objects_found": 5,
      "sample_keys": ["survey/2025/..."]
    }
  }
}
```

## Individual Commands

```bash
# Just build
./deploy.sh build

# Just push to ECR
./deploy.sh push

# Deploy/update functions
./deploy.sh deploy

# Test hello-world
./deploy.sh test

# Show all function URLs
./deploy.sh urls
```

## Project Structure

```
backend/mitchell/
├── Dockerfile              # Lambda container (Python 3.11 + scientific stack)
├── requirements.txt        # numpy, scipy, sklearn, torch, etc.
├── lambda_function.py      # Router (dispatches to handlers)
├── handlers/               # Individual function handlers
│   ├── __init__.py
│   └── hello_world.py     # ✓ Implemented
│   # TODO:
│   # ├── brain_prediction.py
│   # ├── mind_reading.py
│   # ├── feature_weights.py
│   # ├── individual_features.py
│   # ├── mitchell_baseline.py
│   # ├── feature_prep.py
│   # └── results_aggregator.py
├── shared/                 # Shared analysis code (from notebook)
│   └── __init__.py
│   # TODO:
│   # ├── brain_data.py    # Load .mat files from S3
│   # ├── analysis.py      # Core leave-2-out cross-validation
│   # ├── botastic.py      # Botastic template matching
│   # └── utils.py         # Statistical utilities
├── deploy.sh              # Deployment script
└── README.md              # This file
```

## Adding New Handlers

1. Create handler file: `handlers/my_handler.py`
2. Implement `handler(event, context)` function
3. Add route in `lambda_function.py`
4. Add function config to `deploy.sh` (name, type, timeout, memory)
5. Run `./deploy.sh deploy`

## Testing Locally (Optional)

```bash
# Run container locally
docker build --platform linux/amd64 -t mitchell-brain-prediction .
docker run --platform linux/amd64 -p 9000:8080 \
    -e FUNCTION_TYPE=hello-world \
    mitchell-brain-prediction

# Test in another terminal
curl -X POST "http://localhost:9000/2015-03-31/functions/function/invocations" \
    -d '{"test": "local"}' | jq .
```

## Update Workflow

When you change code:

```bash
# Rebuild and redeploy everything
./deploy.sh full

# Or step by step:
./deploy.sh build   # Rebuild container
./deploy.sh push    # Push to ECR
./deploy.sh deploy  # Update Lambda functions
./deploy.sh test    # Test
```

## Monitoring

```bash
# View logs for hello-world
aws logs tail /aws/lambda/mitchell-hello-world --follow

# Check function status
aws lambda get-function --function-name mitchell-hello-world --region us-east-1
```

## Configuration

- **S3 Bucket**: `neuroscience-fiction` (us-east-1)
- **ECR Repository**: `mitchell-brain-prediction`
- **IAM Role**: `mitchell-lambda-role` (auto-created with S3 access)
- **Region**: us-east-1
- **Memory**: 3008 MB (max, for brain prediction), 512 MB (for lightweight functions)
- **Timeout**: 900s (15 min) for heavy compute, 60s for light functions

## Cost Estimate

- **ECR storage**: ~$0.10/month (one 2GB image)
- **Lambda compute**: ~$0.003 per invocation (3GB × 60s)
- **S3**: Standard rates

**Total per analysis run**: ~$0.05

## Next Steps

1. ✅ Test hello-world (infrastructure validated)
2. Port notebook code to `shared/` modules
3. Implement brain prediction handlers
4. Test with real brain data
5. Build frontend

## Troubleshooting

### Build fails with platform errors
```bash
# Make sure you're building for linux/amd64
docker build --platform linux/amd64 -t mitchell-brain-prediction .
```

### Can't push to ECR
```bash
# Re-login
aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com
```

### S3 access denied
- Check IAM role has S3 permissions for `neuroscience-fiction` bucket
- Role is created automatically by `deploy.sh`

### Function timeout
- Hello world should be < 5 seconds
- Increase timeout for heavy functions (already set to 900s for brain-prediction)
