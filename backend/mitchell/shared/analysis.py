"""
Core analysis functions for brain prediction and mind reading

Leave-2-out cross-validation and prediction methods
Extracted from mitchell_feature_modeling_class.ipynb
"""

import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from collections import defaultdict

from .utils import compare_actual_predicted, botastic_predict_features, pearson_dist


def fit_feature_model(numItems, item1, item2, D, R):
    """
    Fit feature model for a single leave-2-out iteration

    Args:
        numItems: int - Total number of items (60)
        item1: int - First held-out item index
        item2: int - Second held-out item index
        D: [numItems, numVoxels] - Brain responses
        R: [numItems, numFeatures] - Feature ratings

    Returns:
        reg: Fitted LinearRegression model
        score: R² score on training data
        trainX: Standardized training features
        trainY: Standardized training brain data
        testX: Standardized test features
        testY: Standardized test brain data
    """
    # Get train and test items
    all_items = np.array(range(numItems))
    test_items = ((all_items == item1) | (all_items == item2))
    train_items = ~test_items

    # Get the training item brain response and features
    trainBrainData = D[train_items, :]
    trainItemFeatures = R[train_items, :]
    scalerX = StandardScaler()
    scalerY = StandardScaler()
    trainX = scalerX.fit_transform(trainItemFeatures)
    trainY = scalerY.fit_transform(trainBrainData)

    # Get the test item brain response and features
    testBrainData = D[test_items, :]
    testItemFeatures = R[test_items, :]
    testX = scalerX.transform(testItemFeatures)
    testY = scalerY.transform(testBrainData)

    # Learn feature->voxel mapping from training data
    reg = LinearRegression(fit_intercept=False).fit(trainX, trainY)
    score = reg.score(trainX, trainY)

    return reg, score, trainX, trainY, testX, testY


def doBrainPredictionEncodingModel(reg, testX, testY, dissimilarity_fun, append_results):
    """
    Brain prediction using encoding model (features → voxels)

    Args:
        reg: Fitted LinearRegression model
        testX: Test features (standardized)
        testY: Test brain data (standardized)
        dissimilarity_fun: Function to compute dissimilarity
        append_results: Callback to store results
    """
    # Predict brain data from features
    predBrainData = reg.predict(testX)

    task = 'brain_prediction'
    method = 'encoding_model'

    for scoring_method in ['individual', 'combo']:
        res = compare_actual_predicted(
            testY,
            predBrainData,
            dissimilarity_fun,
            accuracy_measure=scoring_method
        )
        append_results(res, task, method, scoring_method)


def doMindReadingEncodingModel(reg, testX, testY, dissimilarity_fun, append_results):
    """
    Mind reading using encoding model (voxels → features)

    Inverts the model: instead of predicting voxels from features,
    we predict features from voxels

    Args:
        reg: Fitted LinearRegression model
        testX: Test features (standardized)
        testY: Test brain data (standardized)
        dissimilarity_fun: Function to compute dissimilarity
        append_results: Callback to store results
    """
    # Predict features from brain data (invert the model)
    # testY @ coef maps brain patterns back to feature space
    predFeatures = testY @ reg.coef_

    task = 'mind_reading'
    method = 'encoding_model'

    for scoring_method in ['individual', 'combo']:
        res = compare_actual_predicted(
            testX,
            predFeatures,
            dissimilarity_fun,
            accuracy_measure=scoring_method
        )
        append_results(res, task, method, scoring_method)


def doBrainPredictionBotasticTemplates(trainX, trainY, testX, testY,
                                       dissimilarity_fun, append_results):
    """
    Brain prediction using botastic template matching

    Instead of learning weights, use similarity between feature patterns
    to weight brain templates

    Args:
        trainX: Training features (standardized)
        trainY: Training brain data (standardized)
        testX: Test features (standardized)
        testY: Test brain data (standardized)
        dissimilarity_fun: Function to compute dissimilarity
        append_results: Callback to store results
    """
    # Predict brain data using feature-similarity-weighted neural templates
    predBrainData = botastic_predict_features(trainY, trainX, testX)

    task = 'brain_prediction'
    method = 'botastic_templates'

    for scoring_method in ['individual', 'combo']:
        res = compare_actual_predicted(
            testY,
            predBrainData,
            dissimilarity_fun,
            accuracy_measure=scoring_method
        )
        append_results(res, task, method, scoring_method)


def doMindReadingBotasticTemplates(trainX, trainY, testX, testY,
                                   dissimilarity_fun, append_results):
    """
    Mind reading using botastic template matching

    Use similarity between brain patterns to weight feature templates

    Args:
        trainX: Training features (standardized)
        trainY: Training brain data (standardized)
        testX: Test features (standardized)
        testY: Test brain data (standardized)
        dissimilarity_fun: Function to compute dissimilarity
        append_results: Callback to store results
    """
    # Predict features using neural-similarity-weighted feature templates
    predFeatures = botastic_predict_features(trainX, trainY, testY)

    task = 'mind_reading'
    method = 'botastic_templates'

    for scoring_method in ['individual', 'combo']:
        res = compare_actual_predicted(
            testX,
            predFeatures,
            dissimilarity_fun,
            accuracy_measure=scoring_method
        )
        append_results(res, task, method, scoring_method)


def doBrainAndFeaturePrediction(brain_data, feature_data, num_voxels=500,
                                zscore_braindata=False, shuffle_features=False,
                                testIndividualFeatures=False, progress_callback=None):
    """
    Hold-two-out prediction of brain_data from feature_data (and vice-versa)

    This is the main analysis function that runs all 1770 leave-2-out iterations

    Args:
        brain_data: dict from load_brain_data_from_s3()
        feature_data: dict from load_feature_data_from_s3()
        num_voxels: int - Number of voxels to use
        zscore_braindata: bool - Whether to z-score brain data
        shuffle_features: bool - Shuffle features (sanity check)
        testIndividualFeatures: bool - Test each feature individually
        progress_callback: Optional function(iteration, total) for progress tracking

    Returns:
        dict with:
            - results: dict of lists with all trial results
            - results_by_feature: dict with individual feature results (if enabled)
            - all_betas: list of beta weights for each iteration
    """
    from .brain_data import prepare_brain_data
    from .feature_data import prepare_ratings

    # Make sure items are in the same order
    assert all(brain_data['itemName'] == feature_data['itemNames']), \
        "Item names don't match between brain and feature data!"

    # Get metadata
    categoryNum = brain_data['categoryNum']
    categoryName = brain_data['categoryName']
    itemName = brain_data['itemName']
    brain_sub = brain_data['brain_sub']
    featureNames = feature_data['featureNames']

    print(f"ANALYZING SUBJECT NUMBER: {brain_sub}")

    # Prepare brain activations
    D = prepare_brain_data(brain_data, num_voxels=num_voxels, zscore_data=zscore_braindata)

    # Prepare feature ratings
    R = prepare_ratings(feature_data, shuffle=shuffle_features)

    # Get dissimilarity function
    dissimilarity_fun = pearson_dist

    # Prepare results storage
    results = defaultdict(list)
    results_by_feature = defaultdict(list) if testIndividualFeatures else None
    all_betas = []

    # For all possible pairs of items (60 choose 2 = 1770)
    numItems = D.shape[0]
    total_pairs = (numItems * (numItems - 1)) // 2
    c = 0

    for item1 in range(0, numItems - 1):
        for item2 in range(item1 + 1, numItems):
            if progress_callback:
                progress_callback(c, total_pairs)

            # Fit the encoding model
            reg, score, trainX, trainY, testX, testY = fit_feature_model(
                numItems, item1, item2, D, R
            )

            # Store the betas
            all_betas.append(reg.coef_)

            # Wrapper to add rows to the results
            def append_results(res, task, method, scoring_method):
                same_category = int(categoryNum[item1] == categoryNum[item2])

                results['brain_subject'].append(brain_sub)
                results['item1_idx'].append(item1)
                results['item2_idx'].append(item2)
                results['item1_name'].append(itemName[item1])
                results['item2_name'].append(itemName[item2])
                results['item1_cat'].append(categoryName[item1])
                results['item2_cat'].append(categoryName[item2])
                results['itemPair'].append((item1, item2))
                results['same_category'].append(same_category)
                results['r2_score'].append(score.mean())
                results['task'].append(task)
                results['method'].append(method)
                results['scoring'].append(scoring_method)
                results['dist11'].append(res['dist11'])
                results['dist22'].append(res['dist22'])
                results['dist12'].append(res['dist12'])
                results['dist21'].append(res['dist21'])
                results['correct'].append(res['correct'])

            # Brain Prediction / Mind Reading
            doBrainPredictionEncodingModel(reg, testX, testY, dissimilarity_fun, append_results)
            doMindReadingEncodingModel(reg, testX, testY, dissimilarity_fun, append_results)
            doBrainPredictionBotasticTemplates(trainX, trainY, testX, testY, dissimilarity_fun, append_results)
            doMindReadingBotasticTemplates(trainX, trainY, testX, testY, dissimilarity_fun, append_results)

            # Analyze each feature independently (optional, expensive)
            if testIndividualFeatures:
                for feat_num, feat_name in enumerate(featureNames):
                    reg_single = LinearRegression().fit(trainX[:, [feat_num]], trainY)
                    r2_score = reg_single.score(trainX[:, [feat_num]], trainY)

                    def append_results_feature(res, task, method, scoring_method):
                        same_category = int(categoryNum[item1] == categoryNum[item2])
                        results_by_feature['feat_num'].append(feat_num)
                        results_by_feature['feat_name'].append(feat_name)
                        results_by_feature['brain_subject'].append(brain_sub)
                        results_by_feature['item1_idx'].append(item1)
                        results_by_feature['item2_idx'].append(item2)
                        results_by_feature['item1_name'].append(itemName[item1])
                        results_by_feature['item2_name'].append(itemName[item2])
                        results_by_feature['item1_cat'].append(categoryName[item1])
                        results_by_feature['item2_cat'].append(categoryName[item2])
                        results_by_feature['itemPair'].append((item1, item2))
                        results_by_feature['same_category'].append(same_category)
                        results_by_feature['r2_score'].append(r2_score.mean())
                        results_by_feature['task'].append(task)
                        results_by_feature['method'].append(method)
                        results_by_feature['scoring'].append(scoring_method)
                        results_by_feature['dist11'].append(res['dist11'])
                        results_by_feature['dist22'].append(res['dist22'])
                        results_by_feature['dist12'].append(res['dist12'])
                        results_by_feature['dist21'].append(res['dist21'])
                        results_by_feature['correct'].append(res['correct'])

                    doBrainPredictionEncodingModel(
                        reg_single, testX[:, [feat_num]], testY,
                        dissimilarity_fun, append_results_feature
                    )

            c += 1

    return {
        'results': results,
        'results_by_feature': results_by_feature,
        'all_betas': all_betas
    }
