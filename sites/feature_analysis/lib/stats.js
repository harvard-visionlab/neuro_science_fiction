/**
 * Statistical Functions
 * Implementations of correlation, mean, and other statistical operations
 */

// Calculate mean of an array
function mean(arr) {
    if (arr.length === 0) return NaN;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

// Calculate mean excluding NaN values
function nanmean(arr) {
    const filtered = arr.filter(val => !isNaN(val) && val !== null && val !== undefined);
    return mean(filtered);
}

// Calculate standard deviation
function std(arr) {
    const m = mean(arr);
    const squareDiffs = arr.map(val => Math.pow(val - m, 2));
    return Math.sqrt(mean(squareDiffs));
}

// Pearson correlation coefficient between two arrays
function correlate(arr1, arr2, debug = false) {
    if (arr1.length !== arr2.length) {
        throw new Error('Arrays must have the same length');
    }

    // Filter out pairs where either value is NaN
    const validPairs = [];
    for (let i = 0; i < arr1.length; i++) {
        if (!isNaN(arr1[i]) && !isNaN(arr2[i]) &&
            arr1[i] !== null && arr1[i] !== undefined &&
            arr2[i] !== null && arr2[i] !== undefined) {
            validPairs.push([arr1[i], arr2[i]]);
        }
    }

    const n = validPairs.length;

    if (debug) {
        console.log('  correlate(): input length:', arr1.length);
        console.log('  correlate(): valid pairs:', n);
        console.log('  correlate(): filtered out:', arr1.length - n);
    }

    if (n === 0) return NaN;

    // Extract valid values
    const valid1 = validPairs.map(p => p[0]);
    const valid2 = validPairs.map(p => p[1]);

    // Calculate means
    const mean1 = mean(valid1);
    const mean2 = mean(valid2);

    // Calculate correlation
    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;

    for (let i = 0; i < n; i++) {
        const diff1 = valid1[i] - mean1;
        const diff2 = valid2[i] - mean2;

        numerator += diff1 * diff2;
        sum1Sq += diff1 * diff1;
        sum2Sq += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1Sq * sum2Sq);

    if (debug) {
        console.log('  correlate(): mean1:', mean1, 'mean2:', mean2);
        console.log('  correlate(): sum1Sq:', sum1Sq, 'sum2Sq:', sum2Sq);
        console.log('  correlate(): denominator:', denominator);
    }

    if (denominator === 0) {
        if (debug) console.log('  correlate(): ZERO DENOMINATOR - returning NaN');
        return NaN;
    }

    const result = numerator / denominator;
    if (debug) console.log('  correlate(): result:', result);

    return result;
}

// Correlation matrix for a 2D array (rows are variables)
function corrcoef(matrix) {
    const n = matrix.length; // number of variables
    const corrMatrix = [];

    for (let i = 0; i < n; i++) {
        corrMatrix[i] = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                corrMatrix[i][j] = 1.0;
            } else {
                const corr = correlate(matrix[i], matrix[j], false);
                corrMatrix[i][j] = corr;
            }
        }
    }

    return corrMatrix;
}

// Get upper triangle indices of a matrix (excluding diagonal)
function triuIndices(n, k = 1) {
    const indices = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + k; j < n; j++) {
            indices.push([i, j]);
        }
    }
    return indices;
}

// Extract upper triangle values from a matrix
function getUpperTriangle(matrix, k = 1) {
    const n = matrix.length;
    const indices = triuIndices(n, k);
    return indices.map(([i, j]) => matrix[i][j]);
}

// Calculate absolute value
function abs(x) {
    return Math.abs(x);
}

// Element-wise absolute value for array
function absArray(arr) {
    return arr.map(abs);
}

// Element-wise absolute value for 2D matrix
function absMatrix(matrix) {
    return matrix.map(row => absArray(row));
}

// Sort features by consistency (average inter-rater correlation)
// This is "Feature Reliability" or "Inter-rater Agreement" per feature
// For each feature:
//   - ratings[i] is an array of N item ratings for rater i
//   - corrcoef(ratings) computes NxN correlation matrix between raters
//   - Each correlation is based on N-item vectors (e.g., 60 items)
//   - We average the upper triangle to get overall feature reliability
function sortFeaturesByConsistency(ratingsByFeature) {
    const results = [];

    Object.entries(ratingsByFeature).forEach(([featureName, ratings]) => {
        const raterVsRater = corrcoef(ratings);  // NxN matrix where N = number of raters
        const numRaters = raterVsRater.length;
        const upperTriangle = getUpperTriangle(raterVsRater);
        const avgCorr = nanmean(upperTriangle);

        results.push({
            featureName: featureName,
            avgCorr: avgCorr
        });
    });

    // Sort by avg correlation (ascending - lowest first)
    results.sort((a, b) => a.avgCorr - b.avgCorr);

    return results;
}

// Compute rater agreement (per-rater performance across features)
// For each feature:
//   - Compute NxN correlation matrix between raters (same as Feature Reliability)
//   - For each rater, compute their average correlation with other raters
// Then across features:
//   - Average each rater's agreement scores to get overall rater performance
// Returns:
//   - results: array of {featureName, rater, avgCorr} for each rater-feature combo
//   - raterVsRaterAll: array of correlation matrices (one per feature)
function computeRaterAgreement(df, ratingsByFeature) {
    const raters = df.unique('workerId');
    const results = [];
    const raterVsRaterAll = [];

    Object.entries(ratingsByFeature).forEach(([featureName, ratings]) => {
        const raterVsRater = corrcoef(ratings);  // NxN matrix for this feature
        const numRaters = raterVsRater.length;

        // For each rater, compute their average correlation with all other raters
        for (let raterNum = 0; raterNum < numRaters; raterNum++) {
            // Average correlation with all other raters (excluding self, which is 1.0)
            const correlations = raterVsRater[raterNum];
            const raterConsistency = (correlations.reduce((sum, val) => sum + val, 0) - 1) / (numRaters - 1);

            results.push({
                featureName: featureName,
                rater: raters[raterNum],
                avgCorr: raterConsistency
            });
        }

        raterVsRaterAll.push(raterVsRater);
    });

    return { results, raterVsRaterAll };
}

// Average correlation across matrices (for rater agreement heatmap)
// Takes an array of NxN correlation matrices (one per feature)
// Returns a single NxN matrix where each cell [i,j] is the average correlation
// between rater i and rater j across all features
// Example: If rater1 vs rater2 has correlation 0.8 on "animacy" and 0.6 on "size",
//          the averaged matrix will have 0.7 at position [1,2]
function averageMatrices(matrices) {
    if (matrices.length === 0) return [];

    const n = matrices[0].length;
    const avgMatrix = [];

    for (let i = 0; i < n; i++) {
        avgMatrix[i] = [];
        for (let j = 0; j < n; j++) {
            const values = matrices.map(m => m[i][j]);
            avgMatrix[i][j] = nanmean(values);
        }
    }

    return avgMatrix;
}

// Compute feature vs feature correlation
function computeFeatureVsFeatureCorr(df) {
    const features = df.unique('featureName');
    const items = df.unique('itemName');

    const featureMatrix = [];

    features.forEach(feature => {
        const itemRatings = [];

        items.forEach(item => {
            const subset = df.subset({ featureName: feature, itemName: item });
            // Average ratings across all raters for this feature-item combination
            if (subset.data.length === 0) {
                // No data for this feature-item combination (all raters excluded)
                itemRatings.push(NaN);
            } else {
                const ratings = subset.data.map(row => row.ratingScaled !== undefined ? row.ratingScaled : row.rating);
                const avgRating = nanmean(ratings);
                itemRatings.push(avgRating);
            }
        });

        featureMatrix.push(itemRatings);
    });

    const featureVsFeature = corrcoef(featureMatrix);

    return { featureMatrix, featureVsFeature };
}

// Compute item vs item correlation
function computeItemVsItemCorr(df) {
    const features = df.unique('featureName');
    const items = df.unique('itemName');

    const itemMatrix = [];

    items.forEach(item => {
        const featureRatings = [];

        features.forEach(feature => {
            const subset = df.subset({ featureName: feature, itemName: item });
            // Average ratings across all raters for this item-feature combination
            if (subset.data.length === 0) {
                // No data for this item-feature combination (all raters excluded)
                featureRatings.push(NaN);
            } else {
                const ratings = subset.data.map(row => row.ratingScaled !== undefined ? row.ratingScaled : row.rating);
                featureRatings.push(nanmean(ratings));
            }
        });

        itemMatrix.push(featureRatings);
    });

    const itemVsItem = corrcoef(itemMatrix);

    return { itemMatrix, itemVsItem };
}

// Compute feature redundancy (pairwise correlations)
function computeFeatureRedundancy(df) {
    const { featureVsFeature } = computeFeatureVsFeatureCorr(df);
    const features = df.unique('featureName');
    const numFeatures = features.length;
    const pairs = [];

    for (let i = 0; i < numFeatures - 1; i++) {
        for (let j = i + 1; j < numFeatures; j++) {
            const corr = featureVsFeature[i][j];
            pairs.push({
                feature1: features[i],
                feature2: features[j],
                pair: `${features[i]} vs ${features[j]}`,
                correlation: corr,
                absCorrelation: Math.abs(corr),
                rSquared: corr * corr,  // r² = proportion of variance explained
                sign: corr > 0 ? 'positive' : 'negative'
            });
        }
    }

    // Sort by rSquared (ascending - lowest first)
    pairs.sort((a, b) => a.rSquared - b.rSquared);

    return pairs;
}
