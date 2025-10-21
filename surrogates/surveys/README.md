# Surveys Folder

## Structure

```
surveys/
  ├── original/    # Original .txt files from students (for reference)
  ├── formatted/   # Converted .json files (ready to use with website)
  └── README.md    # This file
```

## Workflow

### Option 1: Instructor Converts (Recommended)

Students submit `.txt` files → Instructor runs conversion → Students use `.json` files

**To convert all student surveys at once:**
```bash
# From the surrogates/ directory
./convert_all.sh surveys/original
```

This will create `.json` files next to each `.txt` file. Then move the JSON files:
```bash
mv surveys/original/*.json surveys/formatted/
```

### Option 2: Students Convert Themselves

Students run the conversion script on their own files before submission.

## Templates

- **Original template**: `original/FeatureSurveyTemplate2.txt`
- **Formatted template**: `formatted/FeatureSurveyTemplate2.json`

## Using the Website

1. Go to the surrogates website
2. Upload a file from `formatted/` (`.json` files)
3. The website also accepts `.txt` files for backward compatibility
