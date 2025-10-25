"""
Run Analysis Handler - Main brain prediction and mind reading analysis

Runs leave-2-out cross-validation (1770 iterations) to predict:
- Brain responses from features (brain prediction)
- Features from brain responses (mind reading)

Lambda Configuration:
- Memory: 5120 MB (based on profiling)
- Timeout: 900 seconds (15 minutes)
- Expected runtime: ~1.8 minutes with testIndividualFeatures=True
"""

import json
from shared.brain_data import load_brain_data
from shared.feature_data import load_feature_data
from shared.analysis import doBrainAndFeaturePrediction


def handler(event, context):
    """
    Run brain prediction and mind reading analysis

    Input (event body):
        {
            "brain_subject": int (1-9),
            "feature_source": str (URL or year/group),
            "year": str (optional, for constructing feature URL),
            "group_name": str (optional, for constructing feature URL),
            "num_voxels": int (default: 500),
            "zscore_braindata": bool (default: False),
            "testIndividualFeatures": bool (default: False),
            "analysis_id": str (unique ID for this run)
        }

    Output:
        {
            "results": {...},  # All 14,160 rows (1770 pairs × 8 combinations)
            "summary": {
                "accuracy_brain_prediction": float,
                "accuracy_mind_reading": float,
                "num_iterations": 1770,
                "elapsed_time": float
            },
            "s3_location": str  # Where results were saved
        }
    """

    # TODO: Implement handler
    # 1. Parse input event
    # 2. Load brain data using load_brain_data(brain_subject)
    # 3. Load feature data using load_feature_data()
    # 4. Run doBrainAndFeaturePrediction()
    # 5. Save results to S3
    # 6. Return summary + S3 location

    return {
        'statusCode': 501,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'error': 'Not implemented yet',
            'handler': 'run_analysis'
        })
    }
