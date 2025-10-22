/**
 * DataFrame Utilities
 * Pandas-like data manipulation for JavaScript
 */

class DataFrame {
    constructor(data) {
        this.data = data; // Array of objects
    }

    // Get unique values from a column
    unique(column) {
        const values = this.data.map(row => row[column]);
        return [...new Set(values)].sort();
    }

    // Filter rows based on predicate function
    filter(predicate) {
        return new DataFrame(this.data.filter(predicate));
    }

    // Get subset of data matching conditions
    subset(conditions) {
        return new DataFrame(this.data.filter(row => {
            return Object.entries(conditions).every(([key, value]) => {
                if (Array.isArray(value)) {
                    return value.includes(row[key]);
                }
                return row[key] === value;
            });
        }));
    }

    // Group by a column
    groupBy(column) {
        const groups = {};
        this.data.forEach(row => {
            const key = row[column];
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(row);
        });
        return new DataFrameGroupBy(groups, column);
    }

    // Get length
    get length() {
        return this.data.length;
    }

    // Get first n rows
    head(n = 10) {
        return new DataFrame(this.data.slice(0, n));
    }

    // Convert to array of objects
    toArray() {
        return this.data;
    }

    // Get column as array
    column(name) {
        return this.data.map(row => row[name]);
    }

    // Sort by column
    sortBy(column, ascending = true) {
        const sorted = [...this.data].sort((a, b) => {
            if (a[column] < b[column]) return ascending ? -1 : 1;
            if (a[column] > b[column]) return ascending ? 1 : -1;
            return 0;
        });
        return new DataFrame(sorted);
    }
}

class DataFrameGroupBy {
    constructor(groups, column) {
        this.groups = groups;
        this.column = column;
    }

    // Count items in each group
    count() {
        const result = {};
        Object.entries(this.groups).forEach(([key, rows]) => {
            result[key] = rows.length;
        });
        return result;
    }

    // Apply function to each group
    apply(func) {
        const result = {};
        Object.entries(this.groups).forEach(([key, rows]) => {
            result[key] = func(new DataFrame(rows));
        });
        return result;
    }

    // Get specific group
    get(key) {
        return new DataFrame(this.groups[key] || []);
    }

    // Get all group keys
    keys() {
        return Object.keys(this.groups).sort();
    }
}

// Helper function to create DataFrame from CSV parsed data
function createDataFrame(parsedData) {
    return new DataFrame(parsedData);
}

// Compute ratings by feature (similar to Python version)
function computeRatingsByFeature(df) {
    const items = df.unique('itemName');
    const features = df.unique('featureName');
    const raters = df.unique('workerId');

    const ratingsByFeature = {};

    features.forEach(featureName => {
        ratingsByFeature[featureName] = [];

        raters.forEach(rater => {
            const ratings = [];

            items.forEach(itemName => {
                const subset = df.subset({
                    featureName: featureName,
                    workerId: rater,
                    itemName: itemName
                });

                if (subset.length > 0) {
                    // Use ratingScaled if available, otherwise use rating
                    const row = subset.data[0];
                    ratings.push(row.ratingScaled !== undefined ? row.ratingScaled : row.rating);
                }
            });

            ratingsByFeature[featureName].push(ratings);
        });
    });

    return ratingsByFeature;
}

// Compute ratings by rater (for rater agreement analysis)
function computeRatingsByRater(df) {
    const items = df.unique('itemName');
    const features = df.unique('featureName');
    const raters = df.unique('workerId');

    const ratingsByRater = {};

    raters.forEach(rater => {
        ratingsByRater[rater] = [];

        features.forEach(featureName => {
            const ratings = [];

            items.forEach(itemName => {
                const subset = df.subset({
                    featureName: featureName,
                    workerId: rater,
                    itemName: itemName
                });

                if (subset.length > 0) {
                    const row = subset.data[0];
                    ratings.push(row.ratingScaled !== undefined ? row.ratingScaled : row.rating);
                }
            });

            ratingsByRater[rater].push(ratings);
        });
    });

    return ratingsByRater;
}

// Categorize rater as LLM or Human
function categorizeRater(workerId) {
    const llmPatterns = /^(gpt|gemini|claude|o3|palm|llama)/i;
    return llmPatterns.test(workerId) ? 'LLM' : 'Human';
}
