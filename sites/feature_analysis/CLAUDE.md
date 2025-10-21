# Feature Analysis Web Application - Implementation Plan

## Overview

This document outlines the plan to convert the Python/Jupyter notebook (`2022/analyze_my_features.ipynb`) into a pure web-based JavaScript application that walks students through feature analysis for their neuroscience experiments.

### Goals

1. **Educational**: Guide students through each analysis step with clear explanations
2. **Interactive**: Allow exploration and decision-making about features and raters
3. **Modern**: Use new Lambda backend for data loading
4. **Accessible**: Pure client-side JavaScript (no server setup required)
5. **Exportable**: Download figures for lab reports
6. **Hybrid-aware**: Account for both human and LLM (surrogate) raters

## Current Workflow (Python/Jupyter)

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

## Implementation Phases

### Phase 1: MVP (Weeks 1-2)
- [ ] Basic HTML structure
- [ ] Data loading from Lambda
- [ ] DataFrame utilities
- [ ] Basic statistics library
- [ ] Step 1: Load Data
- [ ] Step 2: Feature Reliability (bar chart only)

### Phase 2: Core Analysis (Weeks 3-4)
- [ ] Complete statistics library
- [ ] All 6 analysis steps
- [ ] All chart types (bars, heatmaps)
- [ ] Chart.js integration

### Phase 3: Interactivity (Week 5)
- [ ] Step navigation
- [ ] Interactive charts (hover, click)
- [ ] Decision-making UI (checkboxes)
- [ ] Preview filtered data

### Phase 4: Export & Polish (Week 6)
- [ ] Download individual charts
- [ ] Generate comprehensive report
- [ ] LLM vs Human annotations
- [ ] Responsive design
- [ ] Documentation

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

| Aspect | Python/Jupyter | JavaScript Web App |
|--------|----------------|-------------------|
| Data Source | Old server endpoint | New Lambda CSV endpoint |
| Execution | Cell-by-cell | Step-by-step wizard |
| Interactivity | Limited | High (hover, click, filter) |
| Output | Static plots | Interactive charts |
| Export | Notebook download | PNG/PDF per chart |
| Raters | Human only | Human + LLM |
| Setup | Python install | Just open HTML |
| State | Kernel memory | Browser localStorage |

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

## Open Questions

1. Should we support batch processing (multiple groups)?
2. How to handle missing data (incomplete ratings)?
3. Should we cache results in localStorage?
4. Mobile support priority?
5. Offline mode with service workers?

## Resources

- Original notebook: `2022/analyze_my_features.ipynb`
- Surrogates site: `surrogates/` (reference for styling)
- Lambda docs: `surrogates/spec/rating-status-documentation.md`
- Chart.js docs: https://www.chartjs.org/
- Statistical formulas: NumPy correlation documentation

---

**Next Steps**: Begin Phase 1 implementation with basic HTML structure and data loading.
