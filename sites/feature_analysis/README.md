# Feature Analysis Web Application

A browser-based tool for analyzing feature ratings in neuroscience experiments. This application helps students evaluate feature reliability, rater agreement, and feature redundancy to optimize their brain prediction models.

## Overview

This tool converts the Python/Jupyter notebook workflow (`2022/analyze_my_features.ipynb`) into an interactive web application that guides students through analyzing their feature ratings step-by-step.

## Features

### Current (MVP - Phase 1)
- ✅ **Step 1: Data Loading** - Load ratings from Lambda CSV endpoint
- ✅ **Step 2: Feature Reliability** - Analyze inter-rater agreement for each feature
  - Interactive bar chart visualization
  - Downloadable charts (PNG format)
  - Data table with quality ratings
  - Color-coded reliability indicators

### Coming Soon (Phase 2-4)
- 🔲 **Step 3: Rater Agreement** - Analyze how well each rater correlates with others
- 🔲 **Step 4: Feature Redundancy** - Identify highly correlated features
- 🔲 **Step 5: Item Similarity** - Identify confusable items
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

### Understanding the Results

#### Feature Reliability

**What it measures:** How consistently different raters agreed on each feature.

**Interpretation:**
- **r > 0.7** (Green): Excellent reliability - strong agreement
- **r = 0.5-0.7** (Yellow): Good reliability - moderate agreement
- **r = 0.3-0.5** (Orange): Fair reliability - consider reviewing feature definition
- **r < 0.3** (Red): Poor reliability - feature may be too subjective

**What to do:**
- Features with low reliability (<0.5) may need clearer definitions
- Consider dropping features with very poor reliability (<0.3)
- LLM raters may show different consistency patterns than humans

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
- **Charts:** Chart.js v4.4.0
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
- Chart library: Chart.js (https://www.chartjs.org/)
- CSV parser: PapaParse (https://www.papaparse.com/)

## Next Steps

After analyzing your features:
1. Identify features with poor reliability
2. Review feature definitions
3. Consider re-rating or dropping problematic features
4. Proceed with rater agreement analysis (coming soon)
5. Continue through all 6 analysis steps
6. Make final decisions about which features/raters to use

## Support

For questions or issues:
- Check the interpretation guides in each step
- Review the original Jupyter notebook for context
- Check browser console for technical errors

---

**Status:** MVP Phase 1 Complete ✅
**Last Updated:** 2025
**Version:** 1.0.0
