"""
List Feature Sets Handler - List available feature rating datasets

Returns list of available feature rating datasets from S3.

Lambda Configuration:
- Memory: 512 MB
- Timeout: 10 seconds
"""

import json
import urllib.request
import urllib.error


def handler(event, context):
    """
    List available feature rating datasets

    Input (event body, optional):
        {
            "year": str (optional, filter by year)
        }

    Output:
        {
            "feature_sets": [
                {
                    "year": "2025",
                    "group_name": "Testing",
                    "url": "https://...",
                    "num_features": int,
                    "num_raters": int
                },
                ...
            ]
        }
    """

    # TODO: Implement handler
    # 1. List available feature datasets on S3
    # 2. Parse metadata (year, group_name)
    # 3. Optionally download each CSV to get num_features, num_raters
    # 4. Return list

    # For now, return example datasets
    feature_sets = [
        {
            'year': '2020',
            'group_name': 'dopaminemachine',
            'url': 'https://neuroscience-fiction.s3.us-east-1.amazonaws.com/feature-ratings/2020/dopaminemachine_Ratings.csv',
            'num_features': 16,
            'description': 'Original test dataset'
        }
    ]

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'feature_sets': feature_sets,
            'total_count': len(feature_sets)
        })
    }
