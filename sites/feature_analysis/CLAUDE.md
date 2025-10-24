# Feature Analysis Web Application - Implementation Documentation

## Overview

This document describes the completed implementation of a web-based JavaScript application that replaced the Python/Jupyter notebook (`2022/analyze_my_features.ipynb`). The app walks students through feature analysis for their neuroscience experiments in an interactive, step-by-step manner.

**Status**: ✅ **COMPLETED** - All core features implemented and tested.

### Goals Achieved ✅

1. **Educational**: ✅ Guide students through each analysis step with clear explanations
2. **Interactive**: ✅ Allow exploration and decision-making about features and raters
3. **Modern**: ✅ Use new Lambda backend for data loading
4. **Accessible**: ✅ Pure client-side JavaScript (no server setup required)
5. **Exportable**: ✅ Download figures for lab reports
6. **Hybrid-aware**: ✅ Account for both human and LLM (surrogate) raters

## Implementation Summary

### What Was Built

A fully-functional 6-step interactive web application that successfully replaces the Jupyter notebook workflow:

1. **Step 1: Load Data** - Dual data source support (Lambda for LLM ratings, Scorsese for human ratings)
2. **Step 2: Feature Reliability** - Inter-rater correlation analysis with quality categorization
3. **Step 3: Rater Agreement** - Rater-vs-rater correlation with LLM/Human differentiation
4. **Step 4: Feature Redundancy** - Feature-vs-feature r² analysis to identify redundant features
5. **Step 5: Item Similarity** - Item-vs-item correlation with brain prediction impact assessment
6. **Step 6: Analysis Summary** - Color-coded summary with recommendations and filtered dataset export

### Key Features Implemented

- **Flexible Data Loading**: Supports human-only, LLM-only, or mixed datasets
- **Data Integrity Checks**: Validates completeness of ratings, identifies incomplete raters
- **Interactive Filtering**: Real-time exclusion of raters and features with live analysis updates
- **Rich Visualizations**: Plotly.js heatmaps and Chart.js bar charts with download capability
- **Educational Feedback**: Graded assessments (Fantastic/Great/Solid/OK/Challenging) with color coding
- **Progressive State Management**: Progress indicators, completed step tracking, navigation controls
- **r² Interpretation**: Converted redundancy analysis from |r| to r² for easier interpretation

### Technical Stack (As Implemented)

- **HTML5**: Semantic multi-step wizard interface
- **CSS3**: Responsive grid/flexbox layouts with professional styling
- **Vanilla JavaScript (ES6+)**: Async/await, arrow functions, destructuring
- **PapaParse**: CSV parsing for dual data sources
- **Chart.js**: Interactive bar charts with horizontal orientation
- **Plotly.js**: Advanced correlation heatmaps with hover interactions
- **Custom Libraries**:
  - `lib/stats.js` - Statistical functions (correlation, r², NaN-aware operations)
  - `lib/dataframe.js` - Pandas-like data manipulation in JavaScript

## Original Workflow (Python/Jupyter)

The existing notebook performs these analyses:

1. **Data Download**: Fetch ratings from server endpoint
2. **Feature Reliability**: Inter-rater correlation for each feature
3. **Rater Agreement**: How well each rater correlates with others
4. **Feature Redundancy**: Feature-to-feature correlation (identify redundant features)
5. **Item Similarity**: Item-to-item correlation (identify confusable items)
6. **Decision Making**: Students decide which features/raters to drop

## Technical Architecture

### Tech Stack

- **HTML5**: Structure and semantic markup
- **CSS3**: Styling with grid/flexbox layouts
- **Vanilla JavaScript**: Core logic and analysis
- **Chart.js**: Interactive visualizations (MIT license, 64KB)
  - Alternative: Plotly.js (more features, larger ~3MB)
- **PapaParse**: CSV parsing library
- **jsPDF + html2canvas**: Export figures as PDF/PNG

### Data Flow

```
User Input (year, groupName)
    ↓
Lambda CSV Endpoint (GENERATE_CSV_URL)
    ↓
Parse CSV → DataFrame-like structure
    ↓
Statistical Analysis (JS implementations)
    ↓
Interactive Visualizations (Chart.js)
    ↓
User Decisions → Export Results
```

### File Structure

```
sites/feature_analysis/
├── index.html              # Main application
├── styles.css              # Styling
├── script.js               # Main application logic
├── lib/
│   ├── stats.js           # Statistical functions (correlation, etc.)
│   ├── dataframe.js       # DataFrame-like utilities
│   └── charts.js          # Chart generation helpers
├── assets/
│   └── icons/             # UI icons
├── CLAUDE.md              # This file
└── README.md              # User documentation
```

## Implementation Plan

### Phase 1: Foundation & Data Loading

#### 1.1 HTML Structure

Create a multi-step wizard interface:

```html
<!-- Step 1: Load Data -->
<section id="step1-load-data" class="step active">
  <h2>Step 1: Load Your Ratings Data</h2>
  <p class="explanation">...</p>
  <form>
    <input name="year" placeholder="2025">
    <input name="groupName" placeholder="YourGroupName">
    <button>Load Data</button>
  </form>
  <div id="data-summary" style="display:none;">
    <!-- Show: # items, # features, # raters -->
  </div>
</section>

<!-- Steps 2-6 follow similar pattern -->
```

#### 1.2 Data Loading (script.js)

```javascript
const GENERATE_CSV_URL = 'https://psp3lye7ksadwc6d6krb56dmue0yfxjv.lambda-url.us-east-1.on.aws/';

async function loadRatings(year, groupName) {
  const url = `${GENERATE_CSV_URL}?year=${year}&groupName=${groupName}`;
  const response = await fetch(url);
  const csvText = await response.text();
  const data = Papa.parse(csvText, { header: true, dynamicTyping: true });
  return processRatingsData(data.data);
}
```

#### 1.3 DataFrame Utilities (lib/dataframe.js)

Implement pandas-like operations:
- `groupBy(column)` - Group by feature, rater, item
- `unique(column)` - Get unique values
- `filter(predicate)` - Filter rows
- `pivot(rows, columns, values)` - Pivot table

### Phase 2: Statistical Analysis Library

#### 2.1 Core Statistics (lib/stats.js)

Implement these functions from scratch:

```javascript
// Pearson correlation
function correlate(arr1, arr2) {
  // ... implementation
}

// Correlation matrix
function corrcoef(matrix) {
  // Returns NxN correlation matrix
  // ... implementation
}

// Mean, excluding NaN
function nanmean(arr) {
  // ... implementation
}

// Upper triangle indices
function triuIndices(n, k=0) {
  // Returns indices for upper triangle of matrix
  // ... implementation
}
```

#### 2.2 Analysis Functions

Port Python functions to JavaScript:

```javascript
// Feature Reliability
function computeFeatureReliability(df) {
  const ratingsByFeature = computeRatingsByFeature(df);
  const results = [];

  for (const [featureName, ratings] of Object.entries(ratingsByFeature)) {
    const raterVsRater = corrcoef(ratings);
    const avgCorr = nanmean(getUpperTriangle(raterVsRater));
    results.push({ featureName, avgCorr });
  }

  return results.sort((a, b) => a.avgCorr - b.avgCorr);
}

// Rater Agreement
function computeRaterAgreement(df) {
  // ... implementation
}

// Feature Redundancy
function computeFeatureRedundancy(df) {
  // ... implementation
}

// Item Similarity
function computeItemSimilarity(df) {
  // ... implementation
}
```

### Phase 3: Visualizations

#### 3.1 Chart Components (lib/charts.js)

Create reusable chart generators:

```javascript
// Bar chart for feature reliability
function createReliabilityChart(data, canvasId) {
  return new Chart(canvasId, {
    type: 'bar',
    data: {
      labels: data.map(d => d.featureName),
      datasets: [{
        label: 'Average Correlation',
        data: data.map(d => d.avgCorr),
        backgroundColor: '#2196f3'
      }]
    },
    options: {
      indexAxis: 'y',
      scales: { x: { min: 0, max: 1 } }
    }
  });
}

// Heatmap for correlation matrices
function createHeatmap(matrix, labels, canvasId) {
  // Use Chart.js matrix plugin or custom implementation
}
```

#### 3.2 Download Functionality

```javascript
function downloadChart(chartId, filename) {
  const canvas = document.getElementById(chartId);
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

### Phase 4: Step-by-Step Workflow

#### Step 1: Load Data
- Input: year, groupName
- Fetch CSV from Lambda
- Display summary: # items, features, raters
- Show table preview
- **Note**: Explain that raters may include LLM models (e.g., "gpt-5", "gemini-2.5-flash")

#### Step 2: Feature Reliability
- Compute inter-rater correlation per feature
- Display sorted bar chart (low to high)
- Explanation text:
  - "How consistently did raters (humans and LLMs) agree on each feature?"
  - "Higher values indicate better reliability"
  - "Consider features with avgCorr > 0.5"
- Interactive: Click bar to highlight feature
- Download button for chart

#### Step 3: Rater Agreement
- Compute rater-to-rater correlation
- Display heatmap
- Display table of average agreement per rater
- Explanation text:
  - "How well did each rater correlate with others?"
  - "LLM raters may show different patterns than humans"
  - "Consider dropping raters with consistently low agreement"
- Interactive: Hover to see pairwise correlations
- Download button

#### Step 4: Feature Redundancy
- Compute feature-to-feature correlation
- Display heatmap (abs correlation)
- Display sorted bar chart of all pairs
- Threshold slider (default 0.9)
- Explanation text:
  - "Highly correlated features are redundant"
  - "Features > 0.9 correlation may cause regression problems"
  - "Consider dropping one from redundant pairs"
- Interactive: Highlight redundant pairs above threshold
- Download buttons

#### Step 5: Item Similarity
- Compute item-to-item correlation
- Display heatmap
- Show statistics:
  - Average correlation
  - % pairs above threshold (default 0.8)
  - "Most similar item" for each item
- Explanation text:
  - "Even perfect features fail if items are too similar"
  - "High similarity means brain prediction will struggle"
  - "This reveals limitations of your item set, not your features"
- Download button

#### Step 6: Make Decisions
- Interactive checklist interface:
  - Select features to KEEP
  - Select raters to KEEP
- Show preview of filtered dataset
- Recalculate all metrics with selections
- Export options:
  - Download filtered CSV
  - Download analysis report (PDF)
  - Copy decision summary to clipboard

### Phase 5: UI/UX Design

#### Visual Design
- Clean, academic aesthetic (similar to surrogates site)
- Step indicator (1/6, 2/6, etc.)
- Progress bar
- Collapsible explanations
- Tooltips on hover

#### Navigation
- "Next Step" / "Previous Step" buttons
- Jump to step via sidebar
- Auto-scroll to active section

#### Responsive
- Mobile-friendly (though primarily desktop tool)
- Charts resize responsively
- Table horizontal scroll on mobile

### Phase 6: Key Updates for Surrogate Raters

#### Data Loading Notes
```javascript
// When displaying rater list, annotate LLM vs human
function categorizeRater(workerId) {
  const llmPatterns = /^(gpt|gemini|claude|o3)/i;
  return llmPatterns.test(workerId) ? 'LLM' : 'Human';
}
```

#### UI Annotations
- Badge showing "LLM" or "Human" next to rater names
- Help text explaining:
  - "Your dataset may include ratings from LLM models (surrogate raters)"
  - "LLMs may show different inter-rater patterns than humans"
  - "Both are valid - focus on overall feature reliability"

#### Analysis Considerations
- Add optional filter: "Show only human raters" / "Show only LLM raters"
- Compare agreement within LLMs vs within humans vs mixed
- Note in Step 2: "LLM raters may have perfect consistency (deterministic) or variation (temperature > 0)"

### Phase 7: Export & Reporting

#### Individual Chart Downloads
- Each chart has "Download PNG" button
- Filename: `{year}_{groupName}_{analysisType}.png`

#### Comprehensive Report
Generate PDF with:
1. Cover page (year, groupName, date)
2. Data summary
3. All charts
4. Statistical tables
5. Decisions made
6. Recommendations

```javascript
async function generateReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Add cover page
  doc.setFontSize(20);
  doc.text(`Feature Analysis Report`, 20, 20);
  doc.text(`${year} - ${groupName}`, 20, 30);

  // Add charts (using html2canvas)
  // ...

  doc.save(`${year}_${groupName}_analysis.pdf`);
}
```

## Implementation Status

### Phase 1: Foundation ✅ COMPLETED
- [x] Basic HTML structure with 6-step wizard
- [x] Dual data loading (Lambda + Scorsese endpoints)
- [x] DataFrame utilities (lib/dataframe.js)
- [x] Complete statistics library (lib/stats.js)
- [x] Step 1: Load Data with integrity checks
- [x] Step 2: Feature Reliability with quality categorization

### Phase 2: Core Analysis ✅ COMPLETED
- [x] All statistical functions (correlation, r², nanmean, etc.)
- [x] All 6 analysis steps fully functional
- [x] Plotly.js heatmaps for correlation matrices
- [x] Chart.js bar charts with color coding
- [x] Interactive threshold controls

### Phase 3: Interactivity ✅ COMPLETED
- [x] Step navigation with progress indicators
- [x] Interactive charts (hover tooltips, zoom, pan)
- [x] Rater/feature exclusion interface with checkboxes
- [x] Live analysis updates when filters change
- [x] Collapsible data tables (details/summary)

### Phase 4: UX & Polish ✅ COMPLETED
- [x] Download buttons for all charts (PNG)
- [x] Download filtered dataset (CSV)
- [x] LLM vs Human badge annotations
- [x] Color-coded summary with graded feedback
- [x] Responsive design with professional styling
- [x] Comprehensive documentation

### Additional Enhancements Implemented

- [x] **r² Conversion**: Changed Step 4 from |r| to r² for better interpretability
- [x] **Brain Prediction Impact**: Added graded ceiling assessment in Step 5
- [x] **Flexible Pair Display**: Adjustable number of similar pairs to display (1-1000)
- [x] **Progress State Management**: Completed steps remain green, allow re-navigation
- [x] **Data Source Flexibility**: Gracefully handles missing human or LLM data
- [x] **Integrity Validation**: Warns about incomplete raters, missing features

## Testing Strategy

### Unit Tests
- Statistics functions (correlation accuracy)
- DataFrame operations
- Data parsing

### Integration Tests
- End-to-end workflow
- Lambda API calls
- Chart rendering

### User Testing
- Test with real student data
- Gather feedback on explanations
- Verify figures suitable for lab reports

## Dependencies

### Required Libraries
```html
<!-- CSV Parsing -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>

<!-- Charts -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

<!-- Matrix/Heatmap plugin for Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chartjs-chart-matrix@2.0.1/dist/chartjs-chart-matrix.min.js"></script>

<!-- PDF Export -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
```

### Custom Libraries
- `lib/stats.js` - Statistical functions
- `lib/dataframe.js` - Data manipulation
- `lib/charts.js` - Chart helpers

## Key Differences from Original Notebook

| Aspect | Python/Jupyter | JavaScript Web App (Implemented) |
|--------|----------------|----------------------------------|
| Data Source | Old server endpoint | Dual sources: Lambda (LLM) + Scorsese (human) |
| Execution | Cell-by-cell manual | Guided step-by-step wizard |
| Interactivity | Static (rerun cells) | High (live updates, filters, hover) |
| Output | Static matplotlib plots | Interactive Plotly.js heatmaps + Chart.js bars |
| Export | Download .ipynb | Individual PNG downloads per chart |
| Raters | Human only | Human + LLM with visual differentiation |
| Setup | Python/Jupyter install | Just open in browser (no install) |
| State | Kernel memory | In-memory JavaScript (appState object) |
| Redundancy Metric | Absolute correlation \|r\| | r² (variance explained) for clarity |
| Feedback | Manual interpretation | Automated graded assessments with colors |

## Educational Enhancements

### Inline Help
- Tooltips explaining statistical terms
- "What does this mean?" expandable sections
- Example interpretations
- Common pitfalls warnings

### Guided Decision Making
- Recommendations based on thresholds
- "Traffic light" indicators (red/yellow/green)
- Auto-suggest features to drop
- Validation warnings

### Visual Feedback
- Loading spinners during computation
- Progress indicators
- Success/error messages
- Smooth transitions between steps

## Accessibility Considerations

- ARIA labels for screen readers
- Keyboard navigation support
- High contrast mode option
- Alt text for all charts
- Export charts as accessible tables

## Future Enhancements (Post-MVP)

1. **Comparison Mode**: Compare multiple datasets side-by-side
2. **Version History**: Save and recall previous analyses
3. **Collaboration**: Share analysis URLs with parameters
4. **Advanced Statistics**: PCA, hierarchical clustering
5. **Brain Data Integration**: Upload fMRI data for actual predictions
6. **API Integration**: Trigger re-rating for low-reliability features

## Success Metrics

- Students can complete analysis in < 30 minutes
- Generated figures suitable for publication in lab reports
- Clear understanding of which features/raters to keep
- Successful integration with brain prediction pipeline
- Positive feedback on educational value

## Implementation Decisions Made

1. **Batch processing**: Not implemented - focus on single-group workflow for simplicity
2. **Missing data**: Implemented intelligent handling - filters out incomplete raters automatically, shows warnings
3. **Caching**: Not implemented - opted for in-memory state only (simpler, avoids stale data)
4. **Mobile support**: Responsive design implemented, though desktop remains primary target
5. **Offline mode**: Not implemented - requires server connection for data loading

## Key Implementation Details

### Statistical Functions (lib/stats.js)
- **Pearson correlation**: Custom implementation with NaN filtering
- **Correlation matrix**: NxN pairwise correlations between raters/features/items
- **r² calculation**: Added to feature redundancy for interpretability (r² = correlation²)
- **Upper triangle extraction**: For averaging correlation matrices without diagonal
- **NaN-aware operations**: All statistics skip NaN/null/undefined values

### Data Loading Strategy
- **Dual sources**: Fetches both Lambda (surrogate/LLM) and Scorsese (human) endpoints
- **Graceful degradation**: Works with human-only, LLM-only, or mixed datasets
- **Error handling**: Clear messages when data missing, network errors
- **Integrity checks**: Validates all raters have complete ratings for all items/features

### Filtering & State Management
- **Live updates**: Changes to exclusions trigger automatic re-analysis
- **Progress tracking**: Completed steps stay green, allow re-navigation
- **Result clearing**: Filter changes clear downstream results, reset progress
- **Chart cleanup**: Properly destroys Chart.js/Plotly instances before recreating

### Color Grading System

**Feature Reliability**: Green intensity based on % excellent features
**Rater Agreement**: Green (≥0.7) → Teal (0.5-0.7) → Yellow (0.3-0.5) → Orange (0.2-0.3) → Red (<0.2)
**Redundant Pairs**: Green (0) → Teal (1-2) → Yellow (3-5) → Orange (6-10) → Red (>10)
**Item Similarity**: Green (<0.3) → Teal (0.3-0.5) → Yellow (0.5-0.6) → Orange (0.6-0.7) → Red (≥0.7)
**Brain Prediction Impact**: Based on estimated ceiling - 90%+ (Fantastic) down to <60% (Challenging)

## Resources

- Original notebook: `2022/analyze_my_features.ipynb`
- Surrogates site: `surrogates/` (reference for styling)
- Lambda docs: `surrogates/spec/rating-status-documentation.md`
- Chart.js docs: https://www.chartjs.org/
- Plotly.js docs: https://plotly.com/javascript/
- PapaParse docs: https://www.papaparse.com/

---

## Project Completion Summary

**Completed**: January 2025

### Final Deliverables

✅ **Fully functional web application** replacing Jupyter notebook workflow
✅ **6 interactive analysis steps** with professional visualizations
✅ **Dual data source support** for human and LLM raters
✅ **Educational enhancements** with graded feedback and color coding
✅ **Export capabilities** for charts and filtered datasets
✅ **Comprehensive documentation** in CLAUDE.md and inline comments

### Files Delivered

```
sites/feature_analysis/
├── index.html              # Main application (6-step wizard UI)
├── styles.css              # Professional styling with responsive design
├── script.js               # Application logic (~2,500 lines)
├── lib/
│   ├── stats.js           # Statistical functions (correlation, r², etc.)
│   └── dataframe.js       # DataFrame utilities (filter, groupBy, unique)
├── CLAUDE.md              # This implementation documentation
└── README.md              # User-facing documentation
```

### Improvements Over Original Notebook

1. **User Experience**: Guided wizard vs. manual cell execution
2. **Interactivity**: Live filtering, hover tooltips, dynamic updates
3. **Accessibility**: No installation required, works in any modern browser
4. **Hybrid Raters**: First-class support for LLM + human mixed datasets
5. **Visual Feedback**: Color-coded quality assessments at every step
6. **r² Interpretation**: Simpler variance-explained metric vs. absolute correlation
7. **Brain Prediction Context**: Added ceiling assessment to help students understand limitations
8. **Data Validation**: Automatic detection of incomplete raters, integrity warnings

### Known Limitations

- Requires internet connection for data loading
- Desktop-optimized (responsive but best on larger screens)
- No batch processing for multiple groups
- State not persisted (refresh loses progress)
- Charts use browser canvas (not vector graphics for scaling)

### Future Enhancement Opportunities

1. **localStorage persistence**: Save analysis state to resume later
2. **URL parameters**: Share specific analysis configurations
3. **Batch mode**: Analyze multiple groups in parallel
4. **Advanced statistics**: PCA, hierarchical clustering
5. **PDF report generation**: Comprehensive report with all charts
6. **Comparison mode**: Side-by-side analysis of multiple datasets

### Maintenance Notes

- **Dependencies**: All libraries loaded via CDN (PapaParse, Chart.js, Plotly.js)
- **Browser compatibility**: Tested on modern Chrome/Firefox/Safari
- **Data endpoints**: Lambda URL and Scorsese server must remain accessible
- **Chart memory**: Charts properly destroyed before recreation to prevent memory leaks
- **Error handling**: All async operations wrapped in try-catch with user-friendly messages

---

**Project Status**: ✅ COMPLETE & READY FOR STUDENT USE
