"""
Feature data loading and preparation functions

Handles loading feature ratings from local files, URLs, or year/group identifiers
"""

import os
import urllib.request
import numpy as np
import pandas as pd


# Public S3 base URL for feature ratings
S3_BASE_URL = 'https://s3.us-east-1.amazonaws.com/neuroscience-fiction/'


# Mitchell's canonical item order (grouped by category)
MITCHELL_ITEM_ORDER = [
    'bear', 'cat', 'cow', 'dog', 'horse',  # animals
    'arm', 'eye', 'foot', 'hand', 'leg',  # body parts
    'apartment', 'barn', 'church', 'house', 'igloo',  # buildings
    'arch', 'chimney', 'closet', 'door', 'window',  # building parts
    'coat', 'dress', 'pants', 'shirt', 'skirt',  # clothing
    'bed', 'chair', 'desk', 'dresser', 'table',  # furniture
    'ant', 'bee', 'beetle', 'butterfly', 'fly',  # insects
    'bottle', 'cup', 'glass', 'knife', 'spoon',  # kitchen utensils
    'bell', 'key', 'refrigerator', 'telephone', 'watch',  # man-made objects
    'chisel', 'hammer', 'pliers', 'saw', 'screwdriver',  # tools
    'carrot', 'celery', 'corn', 'lettuce', 'tomato',  # vegetables
    'airplane', 'bicycle', 'car', 'train', 'truck'  # vehicles
]


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


def load_feature_data(year=None, group_name=None, source=None, cache_dir='/tmp'):
    """
    Load feature ratings from year/group, local file path, or public URL

    Args:
        year: str - Year (e.g., '2025') - required if source is None
        group_name: str - Group name (e.g., 'Testing') - required if source is None
        source: str - Alternative to year/group_name:
                     - str starting with http(s): Public URL, downloads and caches
                     - str (other): Local file path, loads directly
        cache_dir: str - Directory to cache downloaded files (default: /tmp)

    Returns:
        dict with:
            - R: [numItems, numFeatures] array of average ratings
            - itemNames: [numItems] array of item names
            - featureNames: [numFeatures] array of feature names

    Examples:
        load_feature_data(year='2025', group_name='Testing')  # From public S3
        load_feature_data(source='./data/ratings.csv')  # Local file
        load_feature_data(source='https://neuroscience-fiction.s3.us-east-1.amazonaws.com/...')  # URL
    """
    # Determine source type and file path
    if source is None:
        # Construct URL from year and group_name
        if year is None or group_name is None:
            raise ValueError('Must provide either source OR both year and group_name')
        url = f'{S3_BASE_URL}feature-ratings/{year}/{group_name}_Ratings.csv'
        cache_file = os.path.join(cache_dir, f'{group_name}_Ratings.csv')
    elif source.startswith('http://') or source.startswith('https://'):
        # Public URL: download and cache
        url = source
        cache_file = os.path.join(cache_dir, os.path.basename(source))
    else:
        # Local file path: use directly
        url = None
        cache_file = source

    # Download if needed
    if url:
        os.makedirs(cache_dir, exist_ok=True)
        if not os.path.exists(cache_file):
            _download_file(url, cache_file)
        else:
            print(f'Using cached feature data: {cache_file}')
    else:
        print(f'Loading feature data from: {cache_file}')

    # Load CSV
    try:
        df = pd.read_csv(cache_file)
    except FileNotFoundError:
        raise FileNotFoundError(
            f'Feature ratings not found at {cache_file}. '
            f'Make sure the file exists or check year/group_name.'
        )

    # Get unique values
    itemNames = sorted(df.itemName.unique())
    featureNames = sorted(df.featureName.unique())
    raters = sorted(df.workerId.unique())

    numItems = len(itemNames)
    numFeatures = len(featureNames)
    numRaters = len(raters)

    print(f'Found {numItems} items, {numFeatures} features, {numRaters} raters')

    # Validate we have all 60 Mitchell items
    if numItems != 60:
        raise ValueError(f'Expected 60 items, got {numItems}')

    # Initialize ratings matrix
    R = np.zeros((numItems, numFeatures))

    # Reorder items to match Mitchell's canonical order
    itemNames = MITCHELL_ITEM_ORDER.copy()

    # Fill in average ratings for each item/feature combination
    for itemNum, itemName in enumerate(itemNames):
        for featureNum, featureName in enumerate(featureNames):
            subset = df[(df.itemName == itemName) & (df.featureName == featureName)]
            numRatings = len(subset)
            assert numRatings == numRaters, \
                f'Expected {numRaters} ratings for {itemName}/{featureName}, got {numRatings}'
            # Use ratingScaled (0-1 scale) as in notebook
            R[itemNum, featureNum] = subset.ratingScaled.mean()

    feature_data = {
        'R': R,
        'itemNames': np.asarray(itemNames, dtype='object'),
        'featureNames': np.asarray(featureNames, dtype='object')
    }

    return feature_data


def prepare_ratings(feature_data, shuffle=False):
    """
    Prepare feature ratings for analysis

    Args:
        feature_data: dict from load_feature_data()
        shuffle: bool - Shuffle features (for sanity check)

    Returns:
        R: [numItems, numFeatures] array of ratings
    """
    # Ensure correct orientation
    if feature_data['R'].shape[1] == 60:
        R = np.transpose(feature_data['R'])
    else:
        R = feature_data['R']

    # Shuffle for sanity check (should destroy prediction)
    if shuffle:
        R = np.array([r[np.random.permutation(r.shape[0])] for r in R])

    return R
