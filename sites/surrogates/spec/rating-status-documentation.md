# Rating Status Lambda Function

## Endpoint
```
https://zfwlalun2v5vkm4bcgnygxqzve0yogwo.lambda-url.us-east-1.on.aws/
```

## Purpose
This Lambda function generates a **Completion Table** that shows which features have been rated by which models (workers). This helps students track their progress and identify which feature/model combinations still need ratings.

## Goal: Completion Table
The completion table provides a matrix view showing:
- **Rows**: Features that need ratings (e.g., "living", "speed", "interaction")
- **Columns**: Models/workers that can provide ratings (e.g., "gpt-4o-mini", "gpt-5", "gemini-2.5-flash")
- **Cells**: Boolean indicating whether that feature has been rated by that model
- **Summary**: Total features, total models used, and total ratings collected

This allows students to see at a glance:
1. Which features still need ratings
2. Which models they've already used for each feature
3. How many total ratings they've collected

## Input Parameters

### HTTP Methods
- **GET**: Query parameters
- **POST**: JSON body

### Required Parameters
- `year` (string): The year of the survey (e.g., "2025")
- `groupName` (string): The group/team name (e.g., "Testing", "eternalcarrot")

### Optional Parameters
- `format` (string): Output format, either "table" (default) or "simple"

## Request Examples

### GET Request
```bash
# Table format (default)
curl "https://zfwlalun2v5vkm4bcgnygxqzve0yogwo.lambda-url.us-east-1.on.aws/?year=2025&groupName=Testing"

# Simple format
curl "https://zfwlalun2v5vkm4bcgnygxqzve0yogwo.lambda-url.us-east-1.on.aws/?year=2025&groupName=Testing&format=simple"
```

### POST Request
```bash
curl -X POST https://zfwlalun2v5vkm4bcgnygxqzve0yogwo.lambda-url.us-east-1.on.aws/ \
  -H "Content-Type: application/json" \
  -d '{
    "year": "2025",
    "groupName": "Testing",
    "format": "table"
  }'
```

### JavaScript Fetch
```javascript
// GET request
const response = await fetch(
  'https://zfwlalun2v5vkm4bcgnygxqzve0yogwo.lambda-url.us-east-1.on.aws/?year=2025&groupName=Testing'
);
const data = await response.json();

// POST request
const response = await fetch(
  'https://zfwlalun2v5vkm4bcgnygxqzve0yogwo.lambda-url.us-east-1.on.aws/',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      year: '2025',
      groupName: 'Testing',
      format: 'table'
    })
  }
);
const data = await response.json();
```

## Output Formats

### Format: "table" (default)
Structured format optimized for rendering a completion table in a UI.

```json
{
  "year": "2025",
  "groupName": "Testing",
  "features": [
    {
      "featureName": "living",
      "workers": {
        "gpt-4o-mini": true,
        "gpt-5": true,
        "gemini-2.5-flash": false
      },
      "totalRatings": 2
    },
    {
      "featureName": "speed",
      "workers": {
        "gpt-4o-mini": true,
        "gpt-5": false,
        "gemini-2.5-flash": true
      },
      "totalRatings": 2
    },
    {
      "featureName": "interaction",
      "workers": {
        "gpt-4o-mini": false,
        "gpt-5": false,
        "gemini-2.5-flash": false
      },
      "totalRatings": 0
    }
  ],
  "workers": ["gemini-2.5-flash", "gpt-4o-mini", "gpt-5"],
  "summary": {
    "totalFeatures": 3,
    "totalWorkers": 3,
    "totalRatings": 4
  }
}
```

**Structure:**
- `features` (array): List of all features found in S3
  - `featureName` (string): Name of the feature
  - `workers` (object): Map of worker ID to boolean (true if rated, false if not)
  - `totalRatings` (number): Count of workers who have rated this feature
- `workers` (array): Sorted list of all unique worker IDs found
- `summary` (object): Aggregate statistics
  - `totalFeatures` (number): Total number of features
  - `totalWorkers` (number): Total number of unique workers/models
  - `totalRatings` (number): Total number of completed ratings across all features

### Format: "simple"
Simplified format showing just the matrix mapping.

```json
{
  "year": "2025",
  "groupName": "Testing",
  "matrix": {
    "living": ["gpt-4o-mini", "gpt-5"],
    "speed": ["gpt-4o-mini", "gemini-2.5-flash"],
    "interaction": []
  },
  "allWorkers": ["gemini-2.5-flash", "gpt-4o-mini", "gpt-5"]
}
```

**Structure:**
- `matrix` (object): Map of feature names to arrays of worker IDs who have rated that feature
- `allWorkers` (array): Sorted list of all unique worker IDs found

### Empty Response (No Ratings Found)
```json
{
  "year": "2025",
  "groupName": "Testing",
  "message": "No ratings found",
  "features": [],
  "workers": []
}
```

### Error Response
```json
{
  "error": "Missing required fields",
  "required": ["year", "groupName"]
}
```

## Use Cases

### 1. Display Completion Table in UI
Use the "table" format to render a visual completion table showing checkmarks or status indicators.

### 2. Check if Rating Already Exists
Before submitting a rating request, check if that feature/worker combination already exists:
```javascript
const status = await fetch('...?year=2025&groupName=Testing').then(r => r.json());
const feature = status.features.find(f => f.featureName === 'living');
const alreadyRated = feature?.workers['gpt-4o-mini'] || false;
```

### 3. Progress Tracking
Show students their overall progress:
```javascript
const status = await fetch('...?year=2025&groupName=Testing').then(r => r.json());
const { totalFeatures, totalWorkers, totalRatings } = status.summary;
const maxPossible = totalFeatures * totalWorkers;
const percentComplete = (totalRatings / maxPossible) * 100;
```

### 4. Identify Missing Ratings
Find which features still need ratings:
```javascript
const status = await fetch('...?year=2025&groupName=Testing').then(r => r.json());
const incomplete = status.features.filter(f => f.totalRatings === 0);
```

## S3 Data Source
The function scans S3 bucket at path:
```
s3://neuroscience-fiction/survey/{year}/{groupName}/{featureName}/{workerId}.json
```

It counts .json files only (ignoring .csv files) to determine completion status.

## Notes
- Worker IDs are typically model names (e.g., "gpt-4o-mini", "gemini-2.5-flash")
- Human raters would also appear as worker IDs (with UUIDs)
- The function returns all features found in S3, even if they have 0 ratings
- Features and workers are alphabetically sorted in the response
