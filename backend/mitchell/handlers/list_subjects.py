"""
List Subjects Handler - List available brain subjects

Returns metadata about available brain subjects (1-9).

Lambda Configuration:
- Memory: 512 MB
- Timeout: 10 seconds
"""

import json


def handler(event, context):
    """
    List available brain subjects

    Input: None required

    Output:
        {
            "subjects": [
                {
                    "subject_id": 1,
                    "name": "P1",
                    "url": "https://neuroscience-fiction.s3.us-east-1.amazonaws.com/...",
                    "num_voxels_available": int,
                    "file_size_mb": float
                },
                ...
            ]
        }
    """

    # TODO: Implement handler
    # 1. Return list of 9 subjects with metadata
    # 2. Could optionally check S3 to verify files exist
    # 3. Include download URLs for each subject

    # For now, return static metadata
    subjects = [
        {
            'subject_id': i,
            'name': f'P{i}',
            'url': f'https://neuroscience-fiction.s3.us-east-1.amazonaws.com/brain-data/mitchell2008/data-science-P{i}_converted.mat',
            'description': f'Subject {i} from Mitchell et al. 2008'
        }
        for i in range(1, 10)
    ]

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'subjects': subjects,
            'total_count': 9
        })
    }
