# Mitchell DevContainer Setup

This DevContainer provides a development environment for testing the Mitchell brain prediction code.

## Features

- Python 3.11 (same as Lambda)
- All dependencies from `requirements.txt` (numpy, scipy, sklearn, torch, etc.)
- JupyterLab for interactive testing
- AWS credentials mounted from host
- VS Code Python extensions

## Usage

### 1. Open in DevContainer

In VS Code:
1. Open the `backend/mitchell` folder
2. Press `Cmd+Shift+P` → "Dev Containers: Reopen in Container"
3. Wait for container to build (~2-3 minutes first time)

### 2. Access JupyterLab

Once the container starts, JupyterLab will automatically launch on port 8888.

**Option A: Use VS Code's forwarded port**
- Click on the "PORTS" tab in VS Code
- Find port 8888
- Click the globe icon to open in browser
- URL: `http://localhost:8888`

**Option B: Use JupyterLab Desktop app**
- JupyterLab will print a URL in the terminal
- Copy the URL (should be `http://127.0.0.1:8888`)
- Paste into JupyterLab Desktop: "File → New Session → Remote Session"

### 3. Create Test Notebooks

Create notebooks in the `notebooks/` directory to test the shared modules:

```python
# Example: test_brain_prediction.ipynb
import sys
sys.path.insert(0, '..')

from shared.brain_data import load_brain_data_from_s3, prepare_brain_data
from shared.feature_data import load_feature_data_from_s3, prepare_ratings
from shared.analysis import doBrainAndFeaturePrediction

# Load data
brain_data = load_brain_data_from_s3(brain_subject=1)
feature_data = load_feature_data_from_s3(year='2025', group_name='Testing')

# Run analysis (just a few iterations for testing)
results = doBrainAndFeaturePrediction(
    brain_data,
    feature_data,
    num_voxels=100,  # Smaller for fast testing
    testIndividualFeatures=False
)

print(f"Accuracy: {sum(results['results']['correct']) / len(results['results']['correct'])}")
```

### 4. AWS Credentials

The container automatically mounts your `~/.aws` directory, so AWS CLI and boto3 will work with your existing credentials.

Make sure you have the `admin` profile configured (or adjust the profile in the code).

## Troubleshooting

### JupyterLab not starting
Check the terminal output for errors. You can manually start it:
```bash
jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --allow-root --NotebookApp.token='' --NotebookApp.password=''
```

### Can't access S3
- Verify AWS credentials are mounted: `ls ~/.aws`
- Test with: `aws s3 ls s3://neuroscience-fiction/ --profile admin`

### Import errors
The container installs all packages from `requirements.txt`. If you get import errors, rebuild:
- `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

## Notes

- The container uses the same dependencies as the Lambda function
- Test your code here before deploying to AWS
- Notebooks are in `.devcontainer/notebooks/` (gitignored by default)
