"""
Utility functions for brain prediction analysis

Extracted from mitchell_feature_modeling_class.ipynb
"""

import numpy as np
from scipy import stats
from scipy.spatial.distance import pdist, squareform


def pearson_dist(a, b):
    """
    Compute Pearson correlation distance between two vectors

    Args:
        a: First vector
        b: Second vector

    Returns:
        float: 1 - correlation (0 = identical, 2 = opposite)
    """
    return 1 - stats.pearsonr(a, b)[0]


def compare_actual_predicted(actual, predicted, dissimilarity_fun, accuracy_measure='combo'):
    """
    Compare actual vs predicted patterns for 2 test items

    Args:
        actual: [2, N] array of actual patterns for 2 items
        predicted: [2, N] array of predicted patterns for 2 items
        dissimilarity_fun: Function to compute dissimilarity (e.g., pearson_dist)
        accuracy_measure: 'combo' or 'individual'

    Returns:
        dict with dissimilarity scores and correct flag
    """
    # Compute all 4 comparisons
    dist11 = dissimilarity_fun(predicted[0, :], actual[0, :])
    dist22 = dissimilarity_fun(predicted[1, :], actual[1, :])
    dist12 = dissimilarity_fun(predicted[0, :], actual[1, :])
    dist21 = dissimilarity_fun(predicted[1, :], actual[0, :])

    if accuracy_measure == 'combo':
        # Sum the dissimilarity scores for the 2 right and 2 wrong comparisons
        totalDistCorrectCombo = dist11 + dist22
        totalDistWrongCombo = dist12 + dist21

        # Got it right if the dissimilarity score for the "right combo" is lower
        correct = float(totalDistCorrectCombo < totalDistWrongCombo)

    else:  # individual
        # Percent correct, individual predictions
        correct = (float(dist11 < dist12) + float(dist22 < dist21)) / 2

    return {
        'dist11': dist11,
        'dist22': dist22,
        'dist12': dist12,
        'dist21': dist21,
        'correct': correct
    }


def botastic_predict_features(prototype_features, prototype_scores, test_scores):
    """
    Predict test_features based on similarity between test_scores and prototype_scores

    This is Bo's eye-movement calibration algorithm, adapted for brain prediction.

    The idea: If two items have similar brain patterns, they should have similar features.
    So we can predict an item's features by finding similar brain patterns in the
    training set and weighting their features by similarity.

    Args:
        prototype_features: [N_proto, N_features] - Features of training items
        prototype_scores: [N_proto, N_voxels] - Brain responses to training items
        test_scores: [N_test, N_voxels] - Brain responses to test items

    Returns:
        predicted_features: [N_test, N_features] - Predicted features for test items
    """
    num_proto = prototype_scores.shape[0]

    # Combine prototype and test scores
    scores = np.concatenate([prototype_scores, test_scores])

    # Compute pairwise distance between all scores (Euclidean)
    dists = squareform(pdist(scores, metric='euclidean'))

    # Get distances from all items to prototypes
    d = dists[:, 0:num_proto]

    # Use least squares to extrapolate from the prototypes
    # x is the matrix that solves: prototype_features = d_prototype @ x
    #
    # Interpretation:
    # - Item0's Feature0 = similarity of Item0 to each prototype (d[0])
    #                      times some weight (x[:,0])
    # - We find weights that work across all prototypes, then apply to test items
    x, resid, rank, s = np.linalg.lstsq(d[0:num_proto, :], prototype_features, rcond=None)

    # Apply the learned weights to all items
    tmp = d @ x

    # Should recover the prototype features (sanity check)
    extrap_prototype_features = tmp[0:num_proto, :]

    # The extrapolated test item features (this is what we want!)
    predicted_features = tmp[num_proto:, :]

    return predicted_features
