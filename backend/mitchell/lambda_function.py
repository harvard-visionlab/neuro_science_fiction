"""
Mitchell Brain Prediction - Lambda Router

This is the main entry point for the Lambda function.
It routes requests to the appropriate handler based on function_type.

Usage:
    1. Set FUNCTION_TYPE environment variable in Lambda config, OR
    2. Pass function_type in event body

Supported function types:
    - hello-world: Test infrastructure
    - run-analysis: Run brain prediction and mind reading analysis
    - get-results: Retrieve analysis results from S3
    - list-subjects: List available brain subjects
    - list-feature-sets: List available feature datasets
    - validate-features: Validate uploaded feature CSV
    - upload-features: Upload feature CSV to S3
    - feature-weights-viz: Generate brain slice visualizations
    - aggregate-results: Aggregate results across subjects
"""

import os
import json


def handler(event, context):
    """
    Main Lambda handler - routes to appropriate function

    Args:
        event: Lambda event dict
        context: Lambda context object

    Returns:
        Response dict from handler
    """

    # Determine function type
    # Priority: 1) event body, 2) environment variable, 3) default to hello-world
    function_type = None

    # Try to get from event body
    if isinstance(event.get('body'), str):
        try:
            body = json.loads(event['body'])
            function_type = body.get('function_type')
        except:
            pass
    elif isinstance(event.get('body'), dict):
        function_type = event['body'].get('function_type')

    # Try direct from event (for direct Lambda invocation)
    if not function_type:
        function_type = event.get('function_type')

    # Try environment variable
    if not function_type:
        function_type = os.environ.get('FUNCTION_TYPE', 'hello-world')

    print(f"Routing to handler: {function_type}")

    # Route to appropriate handler
    if function_type == 'hello-world':
        from handlers.hello_world import handler as hello_handler
        return hello_handler(event, context)

    elif function_type == 'run-analysis':
        from handlers.run_analysis import handler as run_analysis_handler
        return run_analysis_handler(event, context)

    elif function_type == 'get-results':
        from handlers.get_results import handler as get_results_handler
        return get_results_handler(event, context)

    elif function_type == 'list-subjects':
        from handlers.list_subjects import handler as list_subjects_handler
        return list_subjects_handler(event, context)

    elif function_type == 'list-feature-sets':
        from handlers.list_feature_sets import handler as list_feature_sets_handler
        return list_feature_sets_handler(event, context)

    elif function_type == 'validate-features':
        from handlers.validate_features import handler as validate_features_handler
        return validate_features_handler(event, context)

    elif function_type == 'upload-features':
        from handlers.upload_features import handler as upload_features_handler
        return upload_features_handler(event, context)

    elif function_type == 'feature-weights-viz':
        from handlers.feature_weights_viz import handler as feature_weights_viz_handler
        return feature_weights_viz_handler(event, context)

    elif function_type == 'aggregate-results':
        from handlers.aggregate_results import handler as aggregate_results_handler
        return aggregate_results_handler(event, context)

    else:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': f'Unknown function_type: {function_type}',
                'valid_types': [
                    'hello-world',
                    'run-analysis',
                    'get-results',
                    'list-subjects',
                    'list-feature-sets',
                    'validate-features',
                    'upload-features',
                    'feature-weights-viz',
                    'aggregate-results'
                ]
            })
        }
