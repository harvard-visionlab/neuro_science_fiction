"""
Brain data loading and preparation functions

Handles loading fMRI data from local files, URLs, or subject IDs
"""

import os
import urllib.request
import numpy as np
import scipy.io as sio
from scipy.stats import zscore


# Public S3 base URL for brain data
S3_BASE_URL = 'https://neuroscience-fiction.s3.us-east-1.amazonaws.com/brain-data/mitchell2008/'


def _download_file(url, dest_path):
    """
    Download file from public URL

    Args:
        url: str - Public URL to download from
        dest_path: str - Local path to save file
    """
    os.makedirs(os.path.dirname(dest_path) or '.', exist_ok=True)
    print(f'Downloading from {url}')
    urllib.request.urlretrieve(url, dest_path)
    print(f'Cached to {dest_path}')


def load_brain_data(source, cache_dir='/tmp'):
    """
    Load brain data from subject ID, local file path, or public URL

    Args:
        source: int (1-9), str (local file path), or str (public URL)
                - int: Subject number (1-9), downloads from public S3
                - str starting with http(s): Public URL, downloads and caches
                - str (other): Local file path, loads directly
        cache_dir: str - Directory to cache downloaded files (default: /tmp)

    Returns:
        dict with brain data (D, meta, sortIdx, voxelReliability, etc.)

    Examples:
        load_brain_data(1)  # Subject 1 from public S3
        load_brain_data('./data/data-science-P1_converted.mat')  # Local file
        load_brain_data('https://neuroscience-fiction.s3.us-east-1.amazonaws.com/...')  # URL
    """
    # Determine source type and file path
    if isinstance(source, int):
        # Subject ID: convert to public URL
        brain_subject = source
        url = f'{S3_BASE_URL}data-science-P{brain_subject}_converted.mat'
        cache_file = os.path.join(cache_dir, f'data-science-P{brain_subject}_converted.mat')
    elif isinstance(source, str) and (source.startswith('http://') or source.startswith('https://')):
        # Public URL: download and cache
        brain_subject = None
        url = source
        cache_file = os.path.join(cache_dir, os.path.basename(source))
    else:
        # Local file path: use directly
        brain_subject = None
        url = None
        cache_file = source

    # Download if needed
    if url:
        os.makedirs(cache_dir, exist_ok=True)
        if not os.path.exists(cache_file):
            _download_file(url, cache_file)
        else:
            print(f'Using cached brain data: {cache_file}')
    else:
        print(f'Loading brain data from: {cache_file}')

    # Load .mat file
    brain_data = sio.loadmat(
        cache_file,
        squeeze_me=True,
        struct_as_record=True,
        simplify_cells=True
    )

    # Add subject number if available
    if brain_subject is not None:
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
