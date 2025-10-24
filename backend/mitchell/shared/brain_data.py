"""
Brain data loading and preparation functions

Handles loading fMRI data from S3 and preparing it for analysis
"""

import os
import numpy as np
import boto3
import scipy.io as sio
from scipy.stats import zscore


s3_client = boto3.client('s3', region_name='us-east-1')
BUCKET_NAME = 'neuroscience-fiction'


def load_brain_data_from_s3(brain_subject, cache_dir='/tmp'):
    """
    Load brain data for a specific subject from S3

    Args:
        brain_subject: int (1-9) - Which subject's data to load
        cache_dir: str - Directory to cache downloaded files

    Returns:
        dict with brain data (D, meta, sortIdx, voxelReliability, etc.)
    """
    # Create cache directory if needed
    os.makedirs(cache_dir, exist_ok=True)

    # Local cache file
    cache_file = os.path.join(cache_dir, f'data-science-P{brain_subject}_converted.mat')

    # Download from S3 if not cached
    if not os.path.exists(cache_file):
        s3_key = f'brain-data/data-science-P{brain_subject}_converted.mat'
        print(f'Downloading brain data from s3://{BUCKET_NAME}/{s3_key}')
        s3_client.download_file(BUCKET_NAME, s3_key, cache_file)
        print(f'Cached to {cache_file}')
    else:
        print(f'Using cached brain data: {cache_file}')

    # Load .mat file
    brain_data = sio.loadmat(
        cache_file,
        squeeze_me=True,
        struct_as_record=True,
        simplify_cells=True
    )

    # Add subject number to data
    brain_data['brain_sub'] = brain_subject

    return brain_data


def prepare_brain_data(brain_data, num_voxels=None, zscore_data=False):
    """
    Prepare brain data for analysis

    Args:
        brain_data: dict from load_brain_data_from_s3()
        num_voxels: int - Number of most reliable voxels to use (None = all)
        zscore_data: bool - Whether to z-score across items

    Returns:
        D: [numItems, numVoxels] array of brain responses
    """
    # D is [numItems, numVoxels, numReps]
    D = brain_data['D']

    # Average across repetitions/runs
    D = D.mean(axis=2)

    # Z-score across items (optional, typically False per notebook)
    if zscore_data:
        D = zscore(D, axis=0, ddof=1)

    # Select number of voxels
    if num_voxels is not None:
        N = min(num_voxels, D.shape[1])
    else:
        N = D.shape[1]

    # sortIdx comes from MATLAB, and is 1-indexed, so subtract 1
    sortIdx = brain_data['sortIdx'][0:N] - 1

    # Take the N most reliable voxels (consistent patterns across runs)
    D = D[:, sortIdx]

    return D
