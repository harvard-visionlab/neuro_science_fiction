# Survey Format Conversion Guide

## Overview

The Feature Survey system has been updated to support a more machine-readable JSON format. This guide explains how to convert existing `.txt` survey files to the new `.json` format.

## Why Convert?

The old `.txt` format had several issues:
- **Hard to parse**: Required complex line-by-line parsing with regex
- **Error-prone**: Easy to make formatting mistakes
- **Poor validation**: Hard to provide helpful error messages
- **Not structured**: Options stored as multi-line strings

The new JSON format is:
- ✓ Easy to parse and validate
- ✓ Clear structure with arrays and objects
- ✓ Better error messages
- ✓ Easier for students to debug

## Format Comparison

### Old Format (.txt)
```
year: 2025
groupName: Testing

feature: living
definition: whether something is living or non-living
question: Is a <> a living thing?
type: yesno

feature: speed
definition: how fast can something move
question: How fast does a <> move?
type: scale
1: it doesn't move
2: less than 1 mph
3: less than 5 mph
```

### New Format (.json)
```json
{
  "year": "2025",
  "groupName": "Testing",
  "features": [
    {
      "name": "living",
      "definition": "whether something is living or non-living",
      "question": "Is a <> a living thing?",
      "type": "yesno"
    },
    {
      "name": "speed",
      "definition": "how fast can something move",
      "question": "How fast does a <> move?",
      "type": "scale",
      "options": [
        {"value": 1, "label": "it doesn't move"},
        {"value": 2, "label": "less than 1 mph"},
        {"value": 3, "label": "less than 5 mph"}
      ]
    }
  ]
}
```

## Converting Files

### Option 1: Convert a Single File

```bash
python3 convert_survey.py input.txt output.json
```

Or let it auto-name the output:
```bash
python3 convert_survey.py MyFeatureSurvey.txt
# Creates: MyFeatureSurvey.json
```

### Option 2: Convert All Student Surveys at Once

If you have multiple student survey files in a directory:

```bash
# Convert all .txt files in current directory
./convert_all.sh

# Or specify a directory
./convert_all.sh /path/to/student/surveys
```

This will:
- Convert all `.txt` files to `.json`
- Skip template files
- Backup originals with `.bak` extension
- Show a summary report

### Option 3: Manual Conversion

If you prefer to convert manually, you can:
1. Copy the structure from `FeatureSurveyTemplate2.json`
2. Fill in your data following the JSON format
3. Validate using any JSON validator

## Website Compatibility

The updated website (`index.html` + `script.js`) now supports **both formats**:
- ✓ New `.json` files (recommended)
- ✓ Old `.txt` files (backward compatible)

Students can upload either format, but `.json` is recommended for:
- Better validation
- Clearer error messages
- Easier debugging

## Validation

The converter validates:
- Required fields: `year`, `groupName`, `features`
- Feature fields: `name`, `definition`, `question`, `type`
- Valid types: `yesno`, `scale`, `checklist`
- Options required for `scale` and `checklist` types

If validation fails, you'll see specific error messages indicating what needs to be fixed.

## For Students

### Creating a New Survey

**Recommended: Use JSON format**
1. Copy `FeatureSurveyTemplate2.json`
2. Update the year and groupName
3. Modify or add features following the structure
4. Upload to the website

**Alternative: Use old format and convert**
1. Copy `FeatureSurveyTemplate2.txt`
2. Fill in your features
3. Run: `python3 convert_survey.py yoursurvey.txt`
4. Upload the generated `.json` file

### Common Mistakes to Avoid

#### In JSON Format:
- ❌ Forgetting commas between array items
- ❌ Using single quotes instead of double quotes
- ❌ Missing closing braces or brackets
- ✓ Use a JSON validator or editor with syntax highlighting

#### In TXT Format:
- ❌ Inconsistent spacing around colons
- ❌ Missing blank lines between features
- ❌ Wrong numbering for options
- ✓ Run the converter to catch these errors

## Troubleshooting

### Conversion Errors

**"Missing required field"**
- Check that you have `year:`, `groupName:`, and at least one `feature:` section

**"Invalid type"**
- Type must be exactly: `yesno`, `scale`, or `checklist`

**"Missing options"**
- `scale` and `checklist` types require numbered options (1:, 2:, etc.)

### Website Upload Errors

**"Invalid survey format"**
- For JSON: Check JSON syntax using jsonlint.com
- For TXT: Try converting to JSON to get specific error messages

**"Feature X is missing required fields"**
- Every feature must have: name, definition, question, and type

## Files in this Directory

- `convert_survey.py` - Python script to convert individual files
- `convert_all.sh` - Bash script to convert all files in a directory
- `FeatureSurveyTemplate2.txt` - Original template (kept for reference)
- `FeatureSurveyTemplate2.json` - New JSON template (recommended)
- `CONVERSION_README.md` - This file

## Questions?

If you encounter issues:
1. Check that your Python version is 3.x: `python3 --version`
2. Validate your JSON syntax using an online validator
3. Look at the example templates for reference
4. Check the error messages - they're designed to be helpful!
