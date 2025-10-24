"""
Hello World Handler - Tests infrastructure

Tests:
- Python scientific stack (numpy, scipy, sklearn)
- S3 access to neuroscience-fiction bucket
- Basic computation
"""

import json
import numpy as np
import scipy
import sklearn
import boto3
from datetime import datetime

# Initialize S3 client
s3_client = boto3.client('s3', region_name='us-east-1')
BUCKET_NAME = 'neuroscience-fiction'


def handler(event, context):
    """
    Hello world handler for testing infrastructure

    Args:
        event: Lambda event (dict)
        context: Lambda context

    Returns:
        dict with statusCode, headers, body
    """

    try:
        # Test scientific Python stack
        test_array = np.array([1, 2, 3, 4, 5])
        mean_val = np.mean(test_array)
        std_val = np.std(test_array)

        # Test scipy
        from scipy.stats import pearsonr
        corr_result = pearsonr([1, 2, 3], [1, 2, 3])

        # Test sklearn
        from sklearn.linear_model import LinearRegression
        model = LinearRegression()

        # Test S3 access - list survey folder
        try:
            response = s3_client.list_objects_v2(
                Bucket=BUCKET_NAME,
                Prefix='survey/',
                MaxKeys=5
            )
            s3_test = {
                'success': True,
                'bucket': BUCKET_NAME,
                'objects_found': response.get('KeyCount', 0),
                'sample_keys': [obj['Key'] for obj in response.get('Contents', [])[:3]]
            }
        except Exception as e:
            s3_test = {
                'success': False,
                'error': str(e)
            }

        # Parse input if provided
        body = event.get('body', {})
        if isinstance(body, str):
            try:
                body = json.loads(body)
            except:
                body = {}

        # Build response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': json.dumps({
                'message': 'Mitchell Brain Prediction - Hello World! 🧠',
                'handler': 'hello_world',
                'timestamp': datetime.utcnow().isoformat(),
                'input_received': body,
                'tests': {
                    'numpy': {
                        'version': np.__version__,
                        'test_mean': float(mean_val),
                        'test_std': float(std_val),
                        'success': True
                    },
                    'scipy': {
                        'version': scipy.__version__,
                        'test_correlation': float(corr_result[0]),
                        'success': True
                    },
                    'sklearn': {
                        'version': sklearn.__version__,
                        'model_created': str(type(model)),
                        'success': True
                    },
                    's3': s3_test
                },
                'environment': {
                    'function_name': context.function_name if context else 'local',
                    'memory_limit_mb': context.memory_limit_in_mb if context else 'N/A',
                    'aws_request_id': context.aws_request_id if context else 'N/A'
                }
            })
        }

    except Exception as e:
        import traceback
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': str(e),
                'type': type(e).__name__,
                'traceback': traceback.format_exc()
            })
        }
