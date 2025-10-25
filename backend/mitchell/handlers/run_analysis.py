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
import os
import traceback
from datetime import datetime
import pandas as pd
import torch
import boto3

from shared.brain_data import load_brain_data
from shared.feature_data import load_feature_data
from shared.analysis import doBrainAndFeaturePrediction


# S3 configuration
S3_BUCKET = 'neuroscience-fiction'
s3_client = boto3.client('s3', region_name='us-east-1')


def handler(event, context):
    """
    Run brain prediction and mind reading analysis

    Input (event body):
        {
            "brain_subject": int (1-9),
            "year": str,
            "group_name": str,
            "num_voxels": int (default: 500),
            "zscore_braindata": bool (default: False),
            "testIndividualFeatures": bool (default: False),
            "overwrite": bool (default: False) - Force recompute even if results exist
        }

    Output:
        {
            "cached": bool (True if returning existing results),
            "brain_subject": int,
            "year": str,
            "group_name": str,
            "num_voxels": int,
            "zscore_braindata": bool,
            "summary": {...},  (only if not cached)
            "s3_urls": {...},
            "files": {...},  (only if not cached)
            "config": {...}
        }
    """

    try:
        # Parse input
        body = event.get('body', {})
        if isinstance(body, str):
            body = json.loads(body)

        # Extract and validate parameters
        brain_subject = body.get('brain_subject')
        year = body.get('year')
        group_name = body.get('group_name')
        num_voxels = body.get('num_voxels', 500)
        zscore_braindata = body.get('zscore_braindata', False)
        testIndividualFeatures = body.get('testIndividualFeatures', False)
        # Default: don't overwrite existing results
        overwrite = body.get('overwrite', False)

        # Validation
        if brain_subject is None or year is None or group_name is None:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Missing required parameters',
                    'required': ['brain_subject', 'year', 'group_name'],
                    'received': {
                        'brain_subject': brain_subject,
                        'year': year,
                        'group_name': group_name
                    }
                })
            }

        if not isinstance(brain_subject, int) or brain_subject < 1 or brain_subject > 9:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Invalid brain_subject',
                    'message': 'brain_subject must be an integer between 1 and 9',
                    'received': brain_subject
                })
            }

        # Check if results already exist (unless overwrite=True)
        # Path structure: analysis-results/{year}/{group_name}/mind-reading/n{voxels}_z{zscore}/brain-subject-{N}/
        zscore_str = 'True' if zscore_braindata else 'False'
        base_key = f'analysis-results/{year}/{group_name}/mind-reading/n{num_voxels}_z{zscore_str}/brain-subject-{brain_subject}'
        config_key = f'{base_key}/config.json'

        if not overwrite:
            print(
                f"Checking if results already exist at s3://{S3_BUCKET}/{config_key}")
            try:
                s3_client.head_object(Bucket=S3_BUCKET, Key=config_key)
                # Config exists - results already computed
                print(f"✓ Results already exist! Returning cached results.")

                # Download config to validate it matches requested parameters
                config_obj = s3_client.get_object(
                    Bucket=S3_BUCKET, Key=config_key)
                config_data = json.loads(config_obj['Body'].read())

                # Validate config matches requested parameters
                config_mismatch = []
                if config_data.get('num_voxels') != num_voxels:
                    config_mismatch.append(
                        f"num_voxels: cached={config_data.get('num_voxels')}, requested={num_voxels}")
                if config_data.get('zscore_braindata') != zscore_braindata:
                    config_mismatch.append(
                        f"zscore_braindata: cached={config_data.get('zscore_braindata')}, requested={zscore_braindata}")
                if config_data.get('testIndividualFeatures') != testIndividualFeatures:
                    config_mismatch.append(
                        f"testIndividualFeatures: cached={config_data.get('testIndividualFeatures')}, requested={testIndividualFeatures}")

                if config_mismatch:
                    # Config doesn't match - need to recompute
                    print(f"✗ Cached results exist but config doesn't match:")
                    for mismatch in config_mismatch:
                        print(f"  - {mismatch}")
                    print(f"Running new analysis with requested parameters...")
                    # Don't return, fall through to run analysis
                else:
                    # Config matches - return cached results
                    print(f"✓ Config matches! Returning cached results.")

                    # Construct S3 URLs for cached results
                    s3_urls = {
                        'results_csv': f'https://s3.us-east-1.amazonaws.com/{S3_BUCKET}/{base_key}/results.csv',
                        'all_betas_pth': f'https://s3.us-east-1.amazonaws.com/{S3_BUCKET}/{base_key}/all_betas.pth',
                        'config_json': f'https://s3.us-east-1.amazonaws.com/{S3_BUCKET}/{base_key}/config.json'
                    }

                    # Only include results_by_feature if it was requested (and should exist)
                    if config_data.get('testIndividualFeatures'):
                        # Verify it actually exists
                        try:
                            s3_client.head_object(
                                Bucket=S3_BUCKET, Key=f'{base_key}/results_by_feature.csv')
                            s3_urls[
                                'results_by_feature_csv'] = f'https://s3.us-east-1.amazonaws.com/{S3_BUCKET}/{base_key}/results_by_feature.csv'
                        except:
                            print(
                                f"Warning: testIndividualFeatures=true but results_by_feature.csv not found")

                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type',
                            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                        },
                        'body': json.dumps({
                            'message': 'Results already exist (cached). Use overwrite=true to recompute.',
                            'cached': True,
                            'config': config_data,
                            'summary': config_data.get('summary', {}),
                            's3_urls': s3_urls
                        })
                    }
            except s3_client.exceptions.NoSuchKey:
                # Config doesn't exist - proceed with analysis
                print(f"✗ Results not found. Running analysis...")
            except Exception as e:
                # Other S3 error - log but proceed with analysis
                print(f"Warning: Could not check for existing results: {e}")
                print(f"Proceeding with analysis...")

        else:
            print(
                f"Overwrite mode enabled. Running analysis regardless of existing results.")

        print(f"\n" + "=" * 60)
        print(f"STARTING ANALYSIS")
        print(f"=" * 60)
        print(f"Brain Subject: {brain_subject}")
        print(f"Feature Data: {year}/{group_name}")
        print(f"Num Voxels: {num_voxels}")
        print(f"Z-score Brain Data: {zscore_braindata}")
        print(f"Test Individual Features: {testIndividualFeatures}")
        print(f"Overwrite Mode: {overwrite}")
        print(f"S3 Path: s3://{S3_BUCKET}/{base_key}/")
        print(f"=" * 60)

        # Load data
        print(f"\nLoading brain data for subject {brain_subject}...")
        brain_data = load_brain_data(brain_subject)

        print(f"Loading feature data for {year}/{group_name}...")
        feature_data = load_feature_data(year=year, group_name=group_name)

        print(f"Brain data shape: {brain_data['D'].shape}")
        print(f"Feature data shape: {feature_data['R'].shape}")
        print(f"Number of features: {len(feature_data['featureNames'])}")

        # Progress callback
        total_iterations = [0]  # Capture total from callback
        start_time = datetime.utcnow()

        def progress_callback(current, total):
            total_iterations[0] = total  # Capture the total
            if current % 100 == 0 or current == total:
                elapsed = (datetime.utcnow() - start_time).total_seconds()
                rate = current / elapsed if elapsed > 0 else 0
                remaining = (total - current) / rate if rate > 0 else 0
                print(f'Progress: {current}/{total} ({current/total*100:.1f}%) | '
                      f'{rate:.1f} iter/s | ETA: {remaining/60:.1f} min')

        # Run analysis
        print(f"\nStarting analysis (1770 iterations)...")
        results = doBrainAndFeaturePrediction(
            brain_data=brain_data,
            feature_data=feature_data,
            num_voxels=num_voxels,
            zscore_braindata=zscore_braindata,
            shuffle_features=False,
            testIndividualFeatures=testIndividualFeatures,
            progress_callback=progress_callback
        )

        end_time = datetime.utcnow()
        elapsed_time = (end_time - start_time).total_seconds()

        print(
            f"\nAnalysis complete! Elapsed time: {elapsed_time:.1f}s ({elapsed_time/60:.2f} min)")

        # Convert results to DataFrames
        print(f"\nConverting results to DataFrames...")
        results_df = pd.DataFrame(results['results'])

        results_by_feature_df = None
        if results['results_by_feature']:
            results_by_feature_df = pd.DataFrame(results['results_by_feature'])

        # Save files locally to /tmp
        print(f"Saving files to /tmp...")
        os.makedirs('/tmp/analysis', exist_ok=True)

        results_csv_path = '/tmp/analysis/results.csv'
        results_df.to_csv(results_csv_path, index=False)

        results_by_feature_csv_path = None
        if results_by_feature_df is not None:
            results_by_feature_csv_path = '/tmp/analysis/results_by_feature.csv'
            results_by_feature_df.to_csv(
                results_by_feature_csv_path, index=False)

        all_betas_path = '/tmp/analysis/all_betas.pth'
        torch.save(results['all_betas'], all_betas_path)

        # Get actual number of iterations from results
        num_iterations = len(results['all_betas'])

        # Compute summary statistics
        print(f"\nComputing summary statistics...")
        summary = compute_summary_statistics(
            results_df, elapsed_time, num_iterations)

        # Save config for reproducibility (includes summary)
        config = {
            'brain_subject': brain_subject,
            'year': year,
            'group_name': group_name,
            'num_voxels': num_voxels,
            'zscore_braindata': zscore_braindata,
            'testIndividualFeatures': testIndividualFeatures,
            'timestamp': start_time.isoformat(),
            'elapsed_time': elapsed_time,
            'num_iterations': num_iterations,
            'num_features': len(feature_data['featureNames']),
            'feature_names': feature_data['featureNames'].tolist(),
            's3_path': f's3://{S3_BUCKET}/{base_key}/',
            'summary': summary
        }
        config_path = '/tmp/analysis/config.json'
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)

        # Upload to S3
        print(f"\nUploading results to S3...")
        zscore_str = 'True' if zscore_braindata else 'False'
        base_key = f'analysis-results/{year}/{group_name}/mind-reading/n{num_voxels}_z{zscore_str}/brain-subject-{brain_subject}'

        files_to_upload = [
            ('results.csv', results_csv_path, 'text/csv'),
            ('all_betas.pth', all_betas_path, 'application/octet-stream'),
            ('config.json', config_path, 'application/json')
        ]

        if results_by_feature_csv_path:
            files_to_upload.append(
                ('results_by_feature.csv', results_by_feature_csv_path, 'text/csv'))

        s3_urls = {}
        file_sizes = {}

        for s3_filename, local_path, content_type in files_to_upload:
            s3_key = f'{base_key}/{s3_filename}'
            print(f"  Uploading {s3_filename} to s3://{S3_BUCKET}/{s3_key}")

            s3_client.upload_file(
                local_path,
                S3_BUCKET,
                s3_key,
                ExtraArgs={
                    'ACL': 'public-read',
                    'ContentType': content_type
                }
            )

            s3_url = f'https://s3.us-east-1.amazonaws.com/{S3_BUCKET}/{s3_key}'
            s3_urls[s3_filename.replace('.', '_')] = s3_url

            # Get file size
            file_size_bytes = os.path.getsize(local_path)
            file_size_mb = file_size_bytes / (1024 * 1024)
            file_sizes[s3_filename.replace(
                '.', '_') + '_size_mb'] = round(file_size_mb, 2)

        # Clean up /tmp files
        print(f"Cleaning up temporary files...")
        for _, local_path, _ in files_to_upload:
            if os.path.exists(local_path):
                os.remove(local_path)

        # Return response
        print(f"\nAnalysis complete and uploaded!")
        print(f"S3 base path: s3://{S3_BUCKET}/{base_key}/")
        print(f"=" * 60)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': json.dumps({
                'message': 'Analysis complete',
                'cached': False,
                'config': {
                    'brain_subject': brain_subject,
                    'year': year,
                    'group_name': group_name,
                    'num_voxels': num_voxels,
                    'zscore_braindata': zscore_braindata,
                    'testIndividualFeatures': testIndividualFeatures,
                    'num_features': len(feature_data['featureNames']),
                    'num_iterations': num_iterations,
                    'timestamp': start_time.isoformat(),
                    'elapsed_time': elapsed_time,
                    's3_path': f's3://{S3_BUCKET}/{base_key}/'
                },
                'summary': summary,
                's3_urls': s3_urls,
                'files': file_sizes
            })
        }

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        print(traceback.format_exc())

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


def compute_summary_statistics(results_df, elapsed_time, num_iterations):
    """
    Compute summary statistics from results DataFrame

    Args:
        results_df: DataFrame with all results
        elapsed_time: Total elapsed time in seconds
        num_iterations: Actual number of iterations run

    Returns:
        dict with summary statistics
    """

    summary = {
        'num_iterations': num_iterations,
        'elapsed_time': round(elapsed_time, 2),
        'elapsed_time_minutes': round(elapsed_time / 60, 2)
    }

    # Compute accuracies for each task/method/scoring combination
    for task in ['brain_prediction', 'mind_reading']:
        for method in ['encoding_model', 'botastic_templates']:
            for scoring in ['individual', 'combo']:
                subset = results_df[
                    (results_df['task'] == task) &
                    (results_df['method'] == method) &
                    (results_df['scoring'] == scoring)
                ]

                if len(subset) > 0:
                    accuracy = subset['correct'].mean()
                    key = f'{task}_{method}_{scoring}'
                    summary[key] = round(accuracy, 4)

    # Compute same-category vs different-category performance
    # (using brain_prediction + encoding_model + combo as default)
    subset = results_df[
        (results_df['task'] == 'brain_prediction') &
        (results_df['method'] == 'encoding_model') &
        (results_df['scoring'] == 'combo')
    ]

    if len(subset) > 0:
        same_cat = subset[subset['same_category'] == 1]
        diff_cat = subset[subset['same_category'] == 0]

        summary['same_category_accuracy'] = round(
            same_cat['correct'].mean(), 4) if len(same_cat) > 0 else None
        summary['different_category_accuracy'] = round(
            diff_cat['correct'].mean(), 4) if len(diff_cat) > 0 else None
        summary['num_same_category'] = int(len(same_cat))
        summary['num_different_category'] = int(len(diff_cat))

    # Average R² score
    if 'r2_score' in results_df.columns:
        summary['mean_r2_score'] = round(results_df['r2_score'].mean(), 4)

    return summary
