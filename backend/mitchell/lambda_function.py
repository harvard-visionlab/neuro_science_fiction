"""
Mitchell Brain Prediction - Lambda Router

This is the main entry point for the Lambda function.
It routes requests to the appropriate handler based on function_type.

Usage:
    1. Set FUNCTION_TYPE environment variable in Lambda config, OR
    2. Pass function_type in event body

Supported function types:
    - hello-world: Test infrastructure
    - brain-prediction: Run brain prediction analysis
    - mind-reading: Run mind reading analysis
    - feature-weights: Generate brain slice visualizations
    - individual-features: Test each feature individually
    - mitchell-baseline: Load Mitchell's baseline results
    - feature-prep: Prepare feature data from CSV
    - results-aggregator: Combine multi-subject results
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

    elif function_type == 'brain-prediction':
        # TODO: Implement tomorrow
        return {
            'statusCode': 501,
            'body': json.dumps({'error': 'brain-prediction handler not yet implemented'})
        }

    elif function_type == 'mind-reading':
        # TODO: Implement tomorrow
        return {
            'statusCode': 501,
            'body': json.dumps({'error': 'mind-reading handler not yet implemented'})
        }

    elif function_type == 'feature-weights':
        # TODO: Implement tomorrow
        return {
            'statusCode': 501,
            'body': json.dumps({'error': 'feature-weights handler not yet implemented'})
        }

    elif function_type == 'individual-features':
        # TODO: Implement tomorrow
        return {
            'statusCode': 501,
            'body': json.dumps({'error': 'individual-features handler not yet implemented'})
        }

    elif function_type == 'mitchell-baseline':
        # TODO: Implement tomorrow
        return {
            'statusCode': 501,
            'body': json.dumps({'error': 'mitchell-baseline handler not yet implemented'})
        }

    elif function_type == 'feature-prep':
        # TODO: Implement tomorrow
        return {
            'statusCode': 501,
            'body': json.dumps({'error': 'feature-prep handler not yet implemented'})
        }

    elif function_type == 'results-aggregator':
        # TODO: Implement tomorrow
        return {
            'statusCode': 501,
            'body': json.dumps({'error': 'results-aggregator handler not yet implemented'})
        }

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
                    'brain-prediction',
                    'mind-reading',
                    'feature-weights',
                    'individual-features',
                    'mitchell-baseline',
                    'feature-prep',
                    'results-aggregator'
                ]
            })
        }
