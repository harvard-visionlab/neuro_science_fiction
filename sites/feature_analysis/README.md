# Feature Analysis Web Application

A browser-based tool for analyzing feature ratings in neuroscience experiments. This application helps students evaluate feature reliability, rater agreement, and feature redundancy to optimize their brain prediction models.

## Overview

This tool converts the Python/Jupyter notebook workflow (`2022/analyze_my_features.ipynb`) into an interactive web application that guides students through analyzing their feature ratings step-by-step.

## Features

### Current (MVP - Phase 1-4)
- ✅ **Step 1: Data Loading** - Load ratings from Lambda CSV endpoint
- ✅ **Step 2: Feature Reliability** - Analyze inter-rater agreement for each feature
  - Interactive bar chart visualization
  - Downloadable charts (PNG format)
  - Data table with quality ratings
  - Color-coded reliability indicators
- ✅ **Step 3: Rater Agreement** - Analyze how well each rater correlates with others
  - Interactive Plotly heatmap
  - Per-rater agreement table
  - Zero-variance feature detection
  - Downloadable heatmap
- ✅ **Step 4: Feature Redundancy** - Identify highly correlated features
  - Interactive heatmap with black-centered colorscale
  - Bar chart with adjustable threshold
  - Detailed redundancy table
  - Downloadable charts
- ✅ **Step 5: Item Similarity** - Identify confusable items
  - Interactive heatmap showing item-vs-item correlation
  - Summary statistics
  - Top 20 most similar pairs table
  - Downloadable heatmap

### Coming Soon (Phase 5)
- 🔲 **Step 6: Decision Making** - Interactive feature/rater selection

## How to Use

### Getting Started

1. **Open the Application**
   - Simply open `index.html` in a modern web browser
   - No server setup required - runs entirely client-side

2. **Load Your Data** (Step 1)
   - Enter your **year** (e.g., 2025)
   - Enter your **group name** (e.g., "dopaminemachine")
   - Click "Load Data"
   - Review the data summary showing items, features, and raters
   - Note: Raters are categorized as Human or LLM (surrogate raters)

3. **Analyze Feature Reliability** (Step 2)
   - Click "Compute Feature Reliability"
   - Review the horizontal bar chart (features sorted from worst to best)
   - Download the chart for your lab report
   - Examine the data table for detailed statistics

4. **Analyze Rater Agreement** (Step 3)
   - Click "Compute Rater Agreement"
   - Review the heatmap showing rater-vs-rater correlations
   - Check the per-rater agreement table
   - Note any zero-variance features that are flagged
   - Download the heatmap for your lab report

5. **Analyze Feature Redundancy** (Step 4)
   - Click "Compute Feature Redundancy"
   - Review the heatmap showing feature-vs-feature correlations
   - Adjust the threshold slider to identify redundant pairs
   - Examine the bar chart and detailed table
   - Download visualizations for your lab report

6. **Analyze Item Similarity** (Step 5)
   - Click "Compute Item Similarity"
   - Review the heatmap showing item-vs-item correlations
   - Check summary statistics for overall similarity
   - Examine the top 20 most similar item pairs
   - Download the heatmap for your lab report

### Understanding the Results

#### Feature Reliability (Inter-rater Agreement)

**What it measures:** How consistently different raters agreed on each feature. This is the classic "inter-rater agreement" measure from the literature.

**Method:** For each feature, correlate each rater's item ratings (e.g., 60 items) with every other rater's item ratings, then average these pairwise correlations.

**Interpretation:**
- **r > 0.7** (Green): Excellent reliability - strong agreement
- **r = 0.5-0.7** (Yellow): Good reliability - moderate agreement
- **r = 0.3-0.5** (Orange): Fair reliability - consider reviewing feature definition
- **r < 0.3** (Red): Poor reliability - feature may be too subjective

**What to do:**
- Features with low reliability (<0.5) may need clearer definitions
- Consider dropping features with very poor reliability (<0.3)
- LLM raters may show different consistency patterns than humans

#### Rater Agreement (Per-rater Performance)

**What it measures:** How well each individual rater correlates with the group across all features. Unlike Step 2 which evaluates features, this evaluates rater performance.

**Method:** For each feature, compute each rater's correlation with all other raters, then average across all features to get each rater's overall agreement score.

**Interpretation:**
- **r > 0.7** (Excellent): Rater closely aligns with group consensus
- **r = 0.5-0.7** (Good): Reasonable alignment with group
- **r = 0.3-0.5** (Fair): Some divergence from group
- **r < 0.3** (Poor): Rater may be using different criteria
- **NaN (zero variance)**: Features where all raters gave identical ratings are automatically excluded from calculations

**What to do:**
- Consider dropping raters with consistently low agreement (<0.3)
- Low agreement between humans and LLMs isn't necessarily bad - may reflect different valid perspectives
- Review the heatmap to identify clusters of similar raters
- Zero-variance features (causing NaN) should likely be removed from your feature set

**Note on NaN values:** If a feature has zero variance (all raters gave identical ratings for all items), correlation cannot be computed and returns NaN. These are automatically excluded from average calculations using `nanmean()`, so your overall rater agreement scores are still valid.

#### Feature Redundancy

**What it measures:** How strongly features correlate with each other. Highly correlated features are redundant and can cause multicollinearity problems in regression models.

**Method:** For each item, compute the average rating across all raters for each feature. Then correlate these average ratings across items to get feature-vs-feature correlations.

**Interpretation:**
- **|r| > 0.9** (Very High): Extremely redundant - one feature can likely be dropped
- **|r| = 0.7-0.9** (Moderate): Some redundancy - consider which is more reliable
- **|r| = 0.5-0.7** (Low): Acceptable correlation - features capture somewhat related concepts
- **|r| < 0.5** (Independent): Features measure distinct properties

**What to do:**
- Consider dropping one feature from pairs with |r| ≥ 0.9
- For redundant pairs, keep the feature with higher inter-rater reliability
- Some correlation is expected for semantically related features
- Use the threshold slider to explore different redundancy levels

#### Item Similarity

**What it measures:** How similar items are in their feature profiles. High similarity means items are confusable and harder to distinguish.

**Method:** For each feature, compute the average rating across all raters for each item. Then correlate these average ratings across features to get item-vs-item correlations.

**Interpretation:**
- **|r| > 0.8** (Very High): Nearly identical feature profiles - items are very confusable
- **|r| = 0.6-0.8** (Moderate): Some overlap in features - moderately similar
- **|r| = 0.4-0.6** (Low): Some shared properties but mostly distinct
- **|r| < 0.4** (Very Low): Distinct items with different feature profiles (ideal)

**What to do:**
- High overall similarity indicates limited coverage of feature space
- This reveals limitations of your item set, not your features
- Consider whether highly similar items (≥0.8) are necessary
- Aim for diverse items with distinct feature profiles
- High item similarity may limit ceiling performance of prediction models

### LLM (Surrogate) Raters

Your dataset may include ratings from both humans and LLM models (e.g., GPT-5, Gemini-2.5-Flash). These are automatically detected and labeled.

**Things to know:**
- LLMs with temperature=0 may have perfect self-consistency
- Humans have natural variation in ratings
- Both types are valid - focus on overall agreement across all raters
- High inter-rater agreement (human+LLM) validates feature clarity

## Technical Details

### Architecture

- **Frontend:** Pure HTML, CSS, JavaScript (no frameworks)
- **Charts:** Chart.js v4.4.0 (bar charts) + Plotly.js (heatmaps)
- **CSV Parsing:** PapaParse v5.4.1
- **Data Source:** AWS Lambda CSV endpoint
- **Statistics:** Custom JavaScript implementations

### File Structure

```
feature_analysis/
├── index.html          # Main application
├── styles.css          # Styling
├── script.js           # Main logic
├── lib/
│   ├── dataframe.js   # DataFrame utilities
│   └── stats.js       # Statistical functions
├── CLAUDE.md          # Implementation plan
└── README.md          # This file
```

### Browser Compatibility

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- Mobile browsers: ⚠️ Works but desktop recommended

## Troubleshooting

### Data won't load
- Check that your year and group name are correct
- Verify you have ratings in the system (check surrogates site)
- Check browser console for specific error messages

### Charts not displaying
- Ensure Chart.js library loads (check browser console)
- Try refreshing the page
- Check internet connection (CDN resources)

### Download button not working
- Ensure pop-up blocker isn't blocking downloads
- Try right-click → Save Image As on the chart

## Development

### Running Locally

No build process required! Just open `index.html` in your browser.

### Testing with Sample Data

Use the example from the original notebook:
- Year: `2022`
- Group Name: `dopaminemachine`

### Adding New Features

See `CLAUDE.md` for the full implementation plan and roadmap for adding additional analysis steps.

## Differences from Original Notebook

| Feature | Python/Jupyter | Web App |
|---------|---------------|---------|
| Setup | Requires Python | Just open HTML |
| Data Loading | Old endpoint | New Lambda endpoint |
| Execution | Cell-by-cell | Step-by-step wizard |
| Visualizations | Static | Interactive |
| Export | Notebook download | PNG per chart |
| Rater Types | Human only | Human + LLM |

## Credits

- Original analysis: `2022/analyze_my_features.ipynb`
- Lambda backend: AWS Lambda functions
- Chart libraries:
  - Chart.js (https://www.chartjs.org/)
  - Plotly.js (https://plotly.com/javascript/)
- CSV parser: PapaParse (https://www.papaparse.com/)

## Next Steps

After analyzing your features:
1. **Step 2:** Identify features with poor reliability (<0.5)
2. **Step 3:** Identify raters with low agreement (<0.3)
3. **Step 3:** Review zero-variance features that should be removed
4. **Step 4:** Identify highly redundant feature pairs (≥0.9)
5. **Step 5:** Assess overall item diversity and confusability
6. **Step 6 (Coming Soon):** Make final decisions about which features/raters to keep
7. Use cleaned dataset for brain prediction models

## Support

For questions or issues:
- Check the interpretation guides in each step
- Review the original Jupyter notebook for context
- Check browser console for technical errors

---

**Status:** Steps 1-5 Complete ✅ | Step 6 In Progress 🚧
**Last Updated:** 2025-10-22
**Version:** 2.0.0
