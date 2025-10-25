# Mind Reading Web Application - Implementation Plan

## Overview

This document outlines the plan for converting the Python/Jupyter notebook (`2022/mitchell_feature_modeling_class.ipynb`) into an interactive web application. The app will enable students to perform "brain prediction" and "mind reading" analyses using their feature ratings and fMRI brain data.

**Status**: =� **PLANNING PHASE** - Architecture and implementation strategy

### Goals

1. **Educational**: Guide students through brain prediction and mind reading analyses with clear explanations
2. **Interactive**: Allow exploration of results across different subjects, features, and methods
3. **Serverless**: Use AWS Lambda (containerized) for heavy computational lifting
4. **Client-side UI**: Pure HTML/CSS/JavaScript with no build system required
5. **Scalable**: Handle large brain datasets and intensive computations efficiently
6. **Exportable**: Download results, visualizations, and comparison reports

## What We're Building

A multi-step interactive web application that successfully replaces the Jupyter notebook workflow:

1. **Step 1: Load Feature Data** - Reuse from feature_analysis (dual source: Lambda for LLM, Scorsese for human ratings)
2. **Step 2: Configure Analysis** - Select brain subjects, analysis methods, parameters
3. **Step 3: Brain Prediction** - Predict brain responses from features, compare to Mitchell baseline
4. **Step 4: Mind Reading** - Predict items/features from brain responses
5. **Step 5: Feature Weights** - Visualize which voxels respond to which features (brain slice viewer)
6. **Step 6: Individual Features** - Determine which features are most predictive
7. **Step 7: Category Analysis** - Same-category vs different-category performance
8. **Step 8: Results Summary** - Export comprehensive analysis report

## Technical Architecture

### Frontend Stack

- **HTML5**: Multi-step wizard interface (similar to feature_analysis)
- **CSS3**: Responsive grid/flexbox layouts
- **Vanilla JavaScript (ES6+)**: Async/await, fetch API
- **PapaParse**: CSV parsing for feature ratings
- **Chart.js**: Interactive bar charts and accuracy plots
- **Plotly.js**: Brain slice heatmaps and 3D visualizations
- **Custom Libraries**:
  - `lib/stats.js` - Client-side statistical utilities (reused from feature_analysis)
  - `lib/dataframe.js` - Data manipulation utilities
  - `lib/brain-viewer.js` - NEW: Brain slice visualization

### Backend Architecture (AWS Serverless)

**Note**: For detailed backend architecture, Lambda configuration, deployment procedures, and SQS integration plans, see [`backend/mitchell/CLAUDE.md`](../../backend/mitchell/CLAUDE.md).

#### Overview

The backend uses **AWS Lambda with Docker containers** to handle computational analysis:
- Containerized Python ML stack (NumPy, SciPy, scikit-learn, PyTorch)
- Analysis takes ~2-7 minutes depending on configuration
- Results cached in S3 for instant retrieval

#### Two Analysis Paths

1. **Automatic Trigger** (for students completing feature ratings)
   - CSV uploaded → S3 event → Automatic full analysis
   - Processes all 9 brain subjects with standard config
   - Takes ~45-60 minutes total (subjects processed in batches of 3)

2. **Direct Invocation** (for custom experiments)
   - Frontend calls Lambda with custom parameters
   - Single subject or specific configuration
   - Used for testing and advanced analyses

#### Backend Endpoints

**mitchell-run-analysis**: Core brain prediction and mind reading analysis
- Runs leave-2-out cross-validation (1770 iterations)
- Takes ~2-7 minutes depending on configuration
- Returns accuracy scores and feature weights

**mitchell-hello-world**: Health check
- Tests dependencies and S3 connectivity

For complete API documentation, see `backend/mitchell/CLAUDE.md`.

---

**Note**: The detailed Lambda function specifications below are deprecated and kept for reference. See `backend/mitchell/CLAUDE.md` for current backend architecture.

<details>
<summary>Deprecated: Detailed Lambda Specifications (click to expand)</summary>

### Frontend-Backend Integration (DEPRECATED)
- **Input**:
  - featureDataS3Key (from step 1)
  - brainSubject (1-9)
  - numVoxels (default: 500)
  - method ('encoding_model' or 'botastic_templates')
  - analysisId (unique ID for this analysis run)
- **Process**:
  - Load brain data for specified subject from S3 or built-in dataset
  - Load feature data from S3
  - Run leave-2-out cross-validation (1770 iterations)
  - For each iteration:
    - Train linear regression (features � voxels)
    - Predict brain response for 2 held-out items
    - Score prediction (correlation distance)
  - Compute accuracy (overall, same-category, different-category)
  - Calculate feature weights (betas)
- **Output**:
  - JSON with 1770 rows (one per item pair)
  - Summary statistics (accuracy overall, by category)
  - Feature weights matrix (N features � M voxels)
- **Storage**: Save to S3 at `brain-prediction/{year}/{groupName}/{analysisId}/subject-{N}-results.json`
- **Timeout**: 15 minutes
- **Memory**: 3008 MB (maximum)
- **Concurrency**: Can run multiple subjects in parallel (9 invocations)

**3. Mind Reading Compute (`mind-reading-compute`)**
- **Input**: Same as brain-prediction-compute
- **Process**:
  - Load brain data and feature data
  - Run leave-2-out cross-validation
  - For each iteration:
    - Train linear regression (features � voxels)
    - Invert to predict features from brain responses
    - Score prediction (correlation between predicted and actual features)
  - Compute accuracy (overall, same-category, different-category)
- **Output**: JSON with results (similar to brain-prediction)
- **Storage**: Save to S3 at `mind-reading/{year}/{groupName}/{analysisId}/subject-{N}-results.json`
- **Timeout**: 15 minutes
- **Memory**: 3008 MB

**4. Feature Weights Visualizer (`feature-weights-viz`)**
- **Input**:
  - analysisId
  - featureName
  - brainSubjects (list, default: [1,2,3,4,5,6,7,8,9])
  - scaling ('relative' or 'absolute')
- **Process**:
  - Load feature weights from brain-prediction results
  - Map weights to 3D brain coordinates (51�61�23 voxel cube)
  - Average across subjects if multiple selected
  - Convert to color-coded slices (yellow/red for positive, blue for negative)
  - Generate 23 PNG images (one per brain slice)
- **Output**:
  - JSON with slice image URLs (S3 presigned URLs or base64)
  - Metadata (voxel coordinates, weight ranges)
- **Storage**: Save PNGs to S3 at `brain-viz/{analysisId}/{featureName}/slice-{N}.png`
- **Timeout**: 2 minutes
- **Memory**: 1024 MB

**5. Individual Feature Analysis (`individual-feature-compute`)**
- **Input**:
  - analysisId
  - brainSubject (1-9)
  - featureNames (list of features to test individually)
- **Process**:
  - For each feature:
    - Run leave-2-out cross-validation using ONLY that feature
    - Compute accuracy
  - Sort features by accuracy
- **Output**: JSON with feature rankings
- **Storage**: Save to S3 at `brain-prediction/{year}/{groupName}/{analysisId}/individual-features-subject-{N}.json`
- **Timeout**: 15 minutes
- **Memory**: 3008 MB

**6. Mitchell Baseline Loader (`mitchell-baseline`)**
- **Input**:
  - numVoxels (default: 500)
  - task ('brain_prediction' or 'mind_reading')
  - method ('encoding_model' or 'botastic_templates')
  - scoring ('individual' or 'combo')
- **Process**:
  - Load pre-computed Mitchell baseline results from S3
  - Extract summary statistics
- **Output**: JSON with Mitchell's accuracy scores
- **Storage**: Pre-populated at `mitchell-baseline/Results-BrainPrediction/Mitchell_500_results_features.pth.tar` (converted to JSON)
- **Timeout**: 30 seconds
- **Memory**: 256 MB

**7. Results Aggregator (`results-aggregator`)**
- **Input**: analysisId
- **Process**:
  - Collect all results from S3 for this analysisId
  - Compute cross-subject averages
  - Generate comparison statistics vs Mitchell baseline
  - Create summary JSON
- **Output**: Complete analysis summary
- **Storage**: Save to S3 at `brain-prediction/{year}/{groupName}/{analysisId}/summary.json`
- **Timeout**: 1 minute
- **Memory**: 512 MB

### Container Layer Strategy

Even with containers, we can optimize by using Lambda layers for shared dependencies that fit within limits:

**Layer 1: Data Processing** (if under 50MB zipped)
- PapaParse equivalent in Python (csv module - built-in)
- JSON processing (built-in)

**All ML/Scientific packages go in Docker image:**
- NumPy
- SciPy
- scikit-learn
- PyTorch (for loading .pth files)
- Pillow (for brain slice images)
- matplotlib (for visualizations)

### S3 Bucket Structure

```
neuro-science-fiction-results/
   survey/                          # Feature ratings (existing)
      {year}/
          {groupName}/
              {featureName}/
                  {modelName}.json
                  {modelName}.csv
   brain-data/                      # Brain fMRI data
      data-science-P1_converted.mat
      data-science-P2_converted.mat
      ... (P3-P9)
   mitchell-baseline/               # Pre-computed Mitchell results
      Mitchell_500_results_features.json
   brain-prediction/                # Brain prediction results
      {year}/
          {groupName}/
              feature-data.json
              {analysisId}/
                  subject-1-results.json
                  subject-2-results.json
                  ... (subject 3-9)
                  summary.json
                  individual-features-subject-{N}.json
   mind-reading/                    # Mind reading results
      {year}/
          {groupName}/
              {analysisId}/
                  subject-1-results.json
                  ...
   brain-viz/                       # Feature weight visualizations
       {analysisId}/
           {featureName}/
               slice-0.png
               slice-1.png
               ... (slice 0-22)
```

### Data Flow

```
User Input (year, groupName)
    �
Load Feature Ratings (PapaParse � CSV from csv-generator Lambda)
    �
[User clicks "Run Brain Prediction"]
    �
Frontend calls feature-data-prep Lambda � S3
    �
Frontend calls brain-prediction-compute Lambda � 9 subjects (parallel)
    �
Each Lambda processes 1770 pairs, saves to S3
    �
Frontend polls S3 for results (or uses EventBridge/SQS for notifications)
    �
Frontend calls results-aggregator Lambda
    �
Display results: Charts, tables, comparisons
    �
[User explores visualizations]
    �
Frontend calls feature-weights-viz Lambda for brain slices
    �
Display interactive brain slice viewer
```

### Handling Long-Running Computations

**Challenge**: 9 subjects � 1770 pairs � complex ML = potentially > 15 minutes

**Solutions**:

1. **Parallel Invocation**:
   - Run each brain subject in a separate Lambda (9 parallel invocations)
   - Each Lambda processes one subject (1770 pairs) � ~90 seconds estimated
   - Frontend makes 9 async calls, tracks progress

2. **Progress Tracking**:
   - Lambda writes progress updates to S3 every 100 iterations
   - Frontend polls S3 for progress.json files
   - Display real-time progress bar for each subject

3. **Caching**:
   - Check S3 before invoking Lambda
   - If results exist for (year, groupName, analysisId, subject), skip computation
   - Allow "force recompute" option

4. **Step Functions** (future enhancement):
   - Orchestrate multi-Lambda workflow
   - Better error handling and retry logic
   - Event-driven notifications when complete

### Alternative: AWS Batch (if Lambda timeouts are an issue)

If processing time exceeds Lambda limits even with parallelization:

**AWS Batch + Fargate**:
- Longer timeout (hours if needed)
- Same Docker container
- More expensive per run, but still serverless (no persistent infrastructure)
- Triggered from Lambda or API Gateway
- Results still saved to S3

**Recommendation**: Start with containerized Lambda, migrate to Batch only if needed.

</details>

---

## Frontend Implementation Plan

### File Structure

```
sites/mind_reading/
   index.html              # Main application
   styles.css              # Styling (inherit from feature_analysis)
   script.js               # Main application logic
   lib/
      stats.js           # Statistical functions (reused)
      dataframe.js       # DataFrame utilities (reused)
      brain-viewer.js    # NEW: Brain slice viewer
   assets/
      brain/             # Brain anatomy reference images
   CLAUDE.md              # This file
   README.md              # User documentation
```

### Step-by-Step Frontend Workflow

#### Step 1: Load Feature Data

**Reuse from feature_analysis:**
- Input: year, groupName
- Dual data loading (Lambda CSV generator + Scorsese)
- Display summary (items, features, raters)
- Rater/feature exclusion interface
- Validation (60 items expected)

**Additional for mind reading:**
- Verify item order matches Mitchell's dataset:
  ```javascript
  const MITCHELL_ITEM_ORDER = [
    'bear', 'cat', 'cow', 'dog', 'horse', // animals
    'arm', 'eye', 'foot', 'hand', 'leg', // body parts
    // ... etc (60 total)
  ];
  ```

#### Step 2: Configure Analysis

**UI Elements:**
- Brain Subject Selection (checkboxes for subjects 1-9)
- Analysis Method Radio Buttons:
  - Encoding Model (standard regression)
  - Botastic Templates (similarity-weighted prediction)
- Number of Voxels Slider (100-5000, default: 500)
- Scoring Method:
  - Individual (average of two separate predictions)
  - Combo (sum of correct pair distances vs wrong pair distances)

**Explanation Text:**
```
Brain Prediction vs Mind Reading:

**Brain Prediction**: We know the features, can we predict brain activity?
- Train: Learn how each voxel responds to each feature (using 58 items)
- Test: Predict brain patterns for 2 held-out items from their features
- Score: Is predicted brain pattern more similar to actual pattern?

**Mind Reading**: We see the brain activity, can we guess what was seen?
- Train: Learn feature-to-voxel mapping (using 58 items)
- Test: Invert the model to predict features from brain patterns
- Score: Do predicted features match the actual item better than the other item?
```

**Generate Analysis ID:**
```javascript
const analysisId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

#### Step 3: Run Brain Prediction

**Process:**
1. Show loading indicator with progress tracking
2. Call `feature-data-prep` Lambda
3. Wait for S3 upload confirmation
4. Call `brain-prediction-compute` Lambda � N subjects (parallel)
5. Poll S3 for progress updates every 2 seconds
6. When complete, call `results-aggregator` Lambda
7. Display results

**UI Components:**
- Progress bars for each subject (0-100%)
- Estimated time remaining
- Pause/cancel buttons (abort Lambda invocations)

**Results Display:**
- **Overall Accuracy Chart**: Bar chart comparing your team vs Mitchell
  - X-axis: Team names
  - Y-axis: Percent correct (0.5-1.0)
  - Show statistical significance (t-test)
- **Accuracy by Subject**: Line chart showing variation across 9 subjects
- **Same vs Different Category**: Side-by-side bar charts
  - Same-category pairs accuracy
  - Different-category pairs accuracy
- **Download Buttons**:
  - Download results JSON
  - Download chart PNG
  - Download detailed CSV (all 1770 pairs)

**Interpretation Guide:**
```
What does it mean?

- **> 0.5**: Above chance! Your model can predict brain activity
- **> Mitchell**: You found better features than the original study!
- **Higher for different-category**: Your features distinguish broad categories well
- **Higher for same-category**: Your features capture fine-grained differences
```

#### Step 4: Run Mind Reading

**Process:** Same as Step 3, but calls `mind-reading-compute` Lambda

**Results Display:** Similar charts, but framed as "mind reading accuracy"

**Interpretation:**
```
Mind Reading Success!

This is the inverse problem: given brain activity, can we determine what
the person was looking at?

- Uses the same feature-to-voxel mapping
- But now we work backwards: brain � features � item
- This is "true" mind reading (not tested in Mitchell's original paper)
```

#### Step 5: Visualize Feature Weights

**UI:**
- Dropdown: Select Feature
- Dropdown: Select Subjects (multi-select, default: all 9)
- Radio: Scaling Method
  - Relative (each feature scaled independently)
  - Absolute (all features use same scale)
- Button: "Generate Brain Slices"

**Process:**
1. Call `feature-weights-viz` Lambda
2. Wait for S3 upload
3. Display 23 brain slices in grid layout

**Brain Slice Viewer:**
```javascript
// lib/brain-viewer.js
class BrainSliceViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.slices = [];
  }

  async loadSlices(featureName, analysisId) {
    // Fetch slice images from S3
    const sliceUrls = await fetchSliceUrls(featureName, analysisId);
    this.slices = sliceUrls;
    this.render();
  }

  render() {
    // Create 5�5 grid (23 slices + 2 empty)
    // Each slice is an <img> with hover tooltip
    // Click to enlarge
  }
}
```

**Display:**
- Grid of brain slices (bottom to top)
- Color legend:
  - Yellow/Red: Positive weights (voxel increases activity for this feature)
  - Blue: Negative weights (voxel decreases activity)
  - Gray: Minimal weight
- Labels: "Bottom of brain" � "Top of brain"
- Interactive: Hover for voxel weight, click to zoom

**Interpretation:**
```
Feature Weights in the Brain

These visualizations show where in the brain each feature is "encoded."

- **Hot spots (yellow/red)**: Voxels that strongly increase activity for this feature
- **Cold spots (blue)**: Voxels that strongly decrease activity
- **Gray matter outline**: The region of brain we analyzed (500 most reliable voxels)

Compare your best feature to your worst feature:
- Best features often have organized, clustered hot/cold regions
- Worst features may look random or have weak weights
```

#### Step 6: Individual Feature Performance

**UI:**
- Button: "Analyze Individual Features"
- Dropdown: Select Brain Subject (default: subject 1)

**Process:**
1. Call `individual-feature-compute` Lambda
2. Display results as bar chart

**Results:**
- Horizontal bar chart: Features sorted by accuracy (low to high)
- X-axis: Percent correct (0.5-0.85)
- Y-axis: Feature names
- Color code:
  - Green: > 0.70
  - Yellow: 0.60-0.70
  - Orange: 0.55-0.60
  - Red: < 0.55

**Interpretation:**
```
Which Feature is Best?

Each feature was tested individually (not combined with other features).

- This tells you which features carry the most predictive power on their own
- Compare to your feature reliability analysis (Step 2 from feature_analysis)
- Do reliable features also predict brain activity well?
- Are there unreliable features that still predict brain activity?
  - Could indicate the feature is real but hard for humans to rate consistently
```

#### Step 7: Category Analysis

**Display:**
- 2�2 grid of bar charts:
  - Brain Prediction (Same Category)
  - Brain Prediction (Different Category)
  - Mind Reading (Same Category)
  - Mind Reading (Different Category)
- Each chart: Your team vs Mitchell

**Interpretation:**
```
Same vs Different Category

**Same-category pairs**: dog vs cat, hammer vs screwdriver
- Harder to distinguish (similar features)
- Tests fine-grained feature sensitivity

**Different-category pairs**: dog vs hammer, cat vs screwdriver
- Easier to distinguish (very different features)
- Tests broad categorical knowledge

Compare your pattern to Mitchell's:
- If you're better at same-category: Your features capture subtle differences
- If you're better at different-category: Your features capture broad categories
```

#### Step 8: Results Summary & Export

**Summary Sections:**

1. **Analysis Overview**
   - Year, Group Name, Analysis ID
   - Date/time run
   - Subjects analyzed (1-9)
   - Method used (encoding model / botastic)
   - Number of voxels

2. **Brain Prediction Results**
   - Overall accuracy: XX.X%
   - Mitchell baseline: XX.X%
   - Difference: +/- X.X% (p = 0.XXX)
   - Verdict: "You defeated Mitchell!" or "Mitchell wins"

3. **Mind Reading Results**
   - Overall accuracy: XX.X%
   - Mitchell baseline: XX.X%
   - Difference: +/- X.X%

4. **Best Features**
   - Top 5 features by individual performance
   - Bottom 5 features

5. **Recommendations**
   - Based on results, suggest which features to keep/drop
   - Compare to feature reliability recommendations

**Export Options:**
- Download comprehensive PDF report
- Download all raw data (JSON)
- Download summary CSV
- Copy results to clipboard (markdown format)

### UI/UX Design (Inherited from feature_analysis)

- Clean, academic aesthetic
- Step indicator (1/8, 2/8, etc.)
- Progress bars for long computations
- Collapsible explanations ("What does this mean?")
- Tooltips on hover
- Responsive design (desktop-optimized)
- "Next/Previous" navigation buttons

## Implementation Phases

### Phase 1: Backend Infrastructure � TO DO

**Priority: High** - This is the foundation

1. **Set up Docker container for Lambda**
   - Base image: `public.ecr.aws/lambda/python:3.11`
   - Install dependencies: numpy, scipy, scikit-learn, torch, pillow, matplotlib
   - Test locally with sample brain data
   - Push to AWS ECR

2. **Upload brain data to S3**
   - Convert Mitchell's brain data to JSON (from .mat files)
   - Upload to `s3://neuro-science-fiction-results/brain-data/`
   - Create metadata index

3. **Upload Mitchell baseline to S3**
   - Convert pre-computed results to JSON
   - Upload to `s3://neuro-science-fiction-results/mitchell-baseline/`

4. **Implement Lambda functions** (in order of dependency):
   - `feature-data-prep`  Start here
   - `mitchell-baseline`  Simple, good for testing
   - `brain-prediction-compute`  Core functionality
   - `mind-reading-compute`  Similar to brain-prediction
   - `results-aggregator`  Depends on compute functions
   - `feature-weights-viz`  Depends on brain-prediction
   - `individual-feature-compute`  Variation of brain-prediction

5. **Test Lambda functions**
   - Unit tests for each function
   - Integration tests with S3
   - Performance testing (measure actual runtime)
   - Optimize memory/timeout settings

6. **Set up API Gateway** (or Lambda Function URLs)
   - REST endpoints for each Lambda
   - CORS configuration
   - Rate limiting
   - API key authentication (optional)

**Estimated Time**: 2-3 weeks

### Phase 2: Frontend Foundation � TO DO

**Priority: High** - User interface basics

1. **Create HTML structure**
   - Copy structure from feature_analysis
   - Adapt for 8 steps
   - Add brain slice viewer container

2. **Create CSS styling**
   - Reuse styles from feature_analysis
   - Add brain-specific styles (slice grid, color legends)

3. **Implement Step 1: Load Feature Data**
   - Copy code from feature_analysis
   - Add item order validation for Mitchell dataset
   - Test with real data

4. **Implement Step 2: Configure Analysis**
   - Brain subject selection UI
   - Method selection UI
   - Parameter inputs
   - Generate analysisId

**Estimated Time**: 1 week

### Phase 3: Core Analysis Integration � TO DO

**Priority: High** - Connect frontend to backend

1. **Implement Step 3: Brain Prediction**
   - Call feature-data-prep Lambda
   - Call brain-prediction-compute Lambda (parallel invocations)
   - Poll S3 for progress
   - Call results-aggregator
   - Display results charts (Chart.js)
   - Comparison to Mitchell baseline

2. **Implement Step 4: Mind Reading**
   - Similar to Step 3
   - Different framing/explanations

3. **Error handling**
   - Lambda timeout handling
   - Network errors
   - Invalid data handling
   - Retry logic

**Estimated Time**: 2 weeks

### Phase 4: Visualizations � TO DO

**Priority: Medium** - Enhanced analysis features

1. **Implement Step 5: Feature Weights Viewer**
   - Call feature-weights-viz Lambda
   - Build brain slice viewer component
   - Interactive zoom/pan
   - Color legend
   - Download individual slices

2. **Implement Step 6: Individual Features**
   - Call individual-feature-compute Lambda
   - Bar chart visualization
   - Comparison to feature reliability

3. **Implement Step 7: Category Analysis**
   - 2�2 chart grid
   - Statistical comparisons

**Estimated Time**: 1.5 weeks

### Phase 5: Summary & Export � TO DO

**Priority: Medium** - Polishing and reporting

1. **Implement Step 8: Summary**
   - Aggregate all results
   - Generate recommendations
   - Export to PDF (jsPDF + html2canvas)
   - Export to CSV
   - Copy to clipboard

2. **Download functionality**
   - Chart downloads (PNG)
   - Data downloads (JSON, CSV)
   - Brain slice downloads

**Estimated Time**: 1 week

### Phase 6: Testing & Optimization � TO DO

**Priority: Medium** - Quality assurance

1. **Frontend testing**
   - End-to-end workflow testing
   - Cross-browser compatibility
   - Responsive design testing
   - Error scenario testing

2. **Backend optimization**
   - Lambda cold start optimization
   - Memory allocation tuning
   - Caching strategy refinement
   - Cost analysis and optimization

3. **Performance testing**
   - Load testing with concurrent users
   - Large dataset handling
   - Progress tracking accuracy

**Estimated Time**: 1 week

### Phase 7: Documentation & Deployment � TO DO

**Priority: Low** - Finalization

1. **User documentation** (README.md)
   - How to use the app
   - What each analysis means
   - Troubleshooting guide
   - FAQ

2. **Developer documentation** (this file)
   - Lambda function API documentation
   - S3 bucket structure
   - Deployment instructions
   - Maintenance guide

3. **Deployment**
   - Push Docker images to ECR
   - Deploy Lambda functions
   - Configure API Gateway
   - Set up CloudWatch logging/monitoring
   - Configure S3 lifecycle policies (auto-delete old results after 30 days)

**Estimated Time**: 3 days

## Key Technical Challenges & Solutions

### Challenge 1: Lambda Package Size

**Problem**: NumPy + SciPy + scikit-learn + PyTorch > 250MB unzipped

**Solution**: Use Docker containers for Lambda
- Package everything in a single image
- Deploy to AWS ECR
- Lambda pulls from ECR on invocation
- No layer size limitations

### Challenge 2: Processing Time

**Problem**: 1770 iterations � 9 subjects could exceed 15-minute Lambda limit

**Solution**: Parallelization
- Run each subject in separate Lambda invocation
- Frontend orchestrates 9 parallel calls
- Each Lambda processes 1770 pairs for one subject (~90 seconds estimated)
- Use S3 for progress tracking

**Fallback**: If single-subject exceeds 15 minutes:
- Migrate to AWS Batch with Fargate
- Same Docker container
- Longer timeout (hours)
- More expensive, but only used if needed

### Challenge 3: Brain Data Storage

**Problem**: .mat files are large, need to be accessible to Lambda

**Solution**: Store in S3, lazy-load in Lambda
- Convert .mat to compressed JSON (or keep as .mat if scipy.io available)
- Lambda downloads from S3 on first invocation
- Cache in `/tmp` directory (512MB-10GB available)
- For frequently accessed data, consider embedding in Docker image

### Challenge 4: Real-time Progress Tracking

**Problem**: Lambda is event-driven, no direct streaming to client

**Solution**: S3-based progress polling
- Lambda writes `progress.json` to S3 every 100 iterations
  ```json
  {
    "subject": 1,
    "completed": 500,
    "total": 1770,
    "percent": 28.2,
    "estimatedTimeRemaining": "45 seconds"
  }
  ```
- Frontend polls S3 every 2 seconds
- Display progress bar
- Alternatively: Use EventBridge + SQS for push notifications (more complex)

### Challenge 5: Cost Management

**Problem**: Lambda + S3 + API Gateway costs scale with usage

**Solution**: Cost optimization strategies
1. **Caching**: Don't recompute if results exist in S3
2. **Memory optimization**: Right-size Lambda memory (test 1024MB vs 3008MB)
3. **S3 lifecycle**: Auto-delete results older than 30 days
4. **Compression**: Gzip JSON results before storing
5. **Lazy loading**: Only run analyses when user clicks "Run"
6. **Batching**: Offer "Run All 9 Subjects" vs "Run Subject 1 First" (let user test with 1 before committing to 9)

**Estimated costs (per analysis run):**
- Lambda compute (9 subjects � 90 seconds � $0.0000166667/GB-second for 3GB): ~$0.04
- Lambda requests (9 invocations � $0.20/1M): negligible
- S3 storage (500MB results � $0.023/GB/month): ~$0.01/month
- S3 requests (PUT/GET): negligible
- **Total per analysis**: ~$0.05

## Alternative Approaches Considered

### 1. Client-Side Computation (WebAssembly)

**Pros:**
- No backend costs
- Instant results (no network latency)
- Works offline

**Cons:**
- Browser memory limits (~2GB)
- Browser computation slower than server
- Large brain data downloads (100MB+ per subject)
- No caching across users
- Complex to implement (would need to compile Python to WASM)

**Decision**: Not feasible due to computation intensity and data size

### 2. Traditional Server (EC2)

**Pros:**
- Full control over environment
- No timeouts
- Persistent state

**Cons:**
- Always-on costs (even when idle)
- Manual scaling
- Server maintenance
- Overkill for low-traffic educational app

**Decision**: Serverless is better fit for low-volume, bursty workload

### 3. SageMaker

**Pros:**
- Optimized for ML workloads
- Jupyter notebook support

**Cons:**
- More expensive than Lambda
- Designed for training, not inference
- Overkill for linear regression
- Complex setup

**Decision**: Lambda containerized is simpler and cheaper

### 4. Lambda Layers Only (No Container)

**Pros:**
- Simpler deployment
- Faster cold starts

**Cons:**
- 250MB unzipped limit (can't fit all dependencies)
- 50MB zipped layer limit
- Would need to exclude PyTorch or SciPy

**Decision**: Container required for full scientific Python stack

## Success Metrics

1. **Functionality**: All 8 steps work end-to-end
2. **Performance**: Brain prediction results returned in < 3 minutes (9 subjects)
3. **Accuracy**: Results match notebook output (validate with known dataset)
4. **Usability**: Students can complete analysis without instructor help
5. **Cost**: < $0.10 per analysis run
6. **Reliability**: < 1% error rate (Lambda failures, S3 errors)

## Deployment Checklist

- [ ] Docker image built and pushed to ECR
- [ ] All 7 Lambda functions deployed
- [ ] Brain data uploaded to S3
- [ ] Mitchell baseline uploaded to S3
- [ ] API Gateway configured with CORS
- [ ] CloudWatch logs enabled
- [ ] S3 lifecycle policy set (30-day deletion)
- [ ] Frontend hosted on GitHub Pages or S3 static site
- [ ] Documentation complete (README + CLAUDE.md)
- [ ] End-to-end testing passed
- [ ] Cost monitoring alerts configured
- [ ] User acceptance testing with students

## Future Enhancements (Post-MVP)

1. **Comparison Mode**: Compare multiple feature sets side-by-side
2. **Custom Brain Data**: Allow upload of different brain datasets
3. **Advanced Methods**: PCA, hierarchical clustering, RSA
4. **Real-time Collaboration**: Share analysis URLs with classmates
5. **Historical Tracking**: Save and compare multiple analysis runs
6. **Batch Processing**: Analyze multiple groups at once
7. **3D Brain Viewer**: Interactive 3D visualization (Three.js)
8. **Export to Notebook**: Generate Jupyter notebook with results
9. **API for Programmatic Access**: Let advanced users call via Python
10. **Student Leaderboard**: Anonymous comparison across all groups

## Resources & References

- Original notebook: `2022/mitchell_feature_modeling_class.ipynb`
- Feature analysis site: `sites/feature_analysis/` (completed reference)
- Backend functions: `backend/surrogate-rater.mjs`, `backend/csv-generator-fixed.mjs`
- Brain data: Dropbox links in notebook (need to migrate to S3)
- Mitchell paper: Mitchell et al. (2008) Science - "Predicting Human Brain Activity Associated with the Meanings of Nouns"
- AWS Lambda containers: https://docs.aws.amazon.com/lambda/latest/dg/images-create.html
- Docker Python base: https://gallery.ecr.aws/lambda/python

---

## Next Steps

1. **Validate Plan**: Review this plan with team, gather feedback
2. **Prototype Backend**: Build and test one Lambda function (`feature-data-prep`) to validate architecture
3. **Test with Sample Data**: Run end-to-end test with one subject, one feature set
4. **Iterate**: Refine based on performance/cost/usability findings
5. **Build Frontend**: Once backend proven, build UI step-by-step
6. **Deploy MVP**: Get basic version working end-to-end
7. **User Testing**: Test with students, gather feedback
8. **Polish**: Add visualizations, export features, documentation
9. **Launch**: Make available for class use

---

**Author**: Claude (Anthropic)
**Date**: 2025-01-24
**Status**: Planning Phase - Ready for Review
