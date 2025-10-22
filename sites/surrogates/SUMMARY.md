# Survey System Update - Summary

## What Was Done

### 1. Created Machine-Readable JSON Format
- Converted the original `.txt` template to a structured `.json` format
- JSON format is easier to parse, validate, and debug
- Options are now arrays of objects instead of multi-line strings

### 2. Built Conversion Tools
- **`convert_survey.py`**: Converts individual `.txt` files to `.json`
- **`convert_all.sh`**: Batch converts all surveys in a directory
- Both tools include validation and helpful error messages

### 3. Updated Website Code
- Modified `script.js` to handle both `.txt` and `.json` formats
- Added `parseJsonSurvey()` function for new format
- Kept backward compatibility with `parseTxtSurvey()` for old format
- Updated `index.html` to accept both file types

### 4. Organized File Structure
```
surrogates/
  ├── index.html                    # Website (updated)
  ├── script.js                     # JavaScript (updated)
  ├── styles.css                    # Unchanged
  ├── convert_survey.py             # Conversion script
  ├── convert_all.sh                # Batch conversion script
  ├── CONVERSION_README.md          # Detailed documentation
  └── surveys/
      ├── original/                 # For student .txt files
      │   └── FeatureSurveyTemplate2.txt
      ├── formatted/                # For converted .json files
      │   └── FeatureSurveyTemplate2.json
      └── README.md                 # Workflow guide
```

## How to Use

### For You (Instructor)

**Option 1: Convert All Student Surveys at Once**
```bash
# Place all student .txt files in surveys/original/
./convert_all.sh surveys/original

# Move converted files
mv surveys/original/*.json surveys/formatted/

# Students can now use the .json files
```

**Option 2: Let Students Use Original .txt Files**
- The website still accepts `.txt` files
- They'll work but with less helpful error messages

### Testing the System

1. Open `index.html` in a browser
2. Upload `surveys/formatted/FeatureSurveyTemplate2.json`
3. The website should:
   - Display: Year 2025, Group "Testing", 3 features
   - Show all three features: living (yesno), speed (scale), interaction (checklist)
   - Allow you to select a feature and configure ratings

## Key Benefits

### Before (txt format)
- ❌ Line-by-line parsing with regex
- ❌ Easy formatting mistakes
- ❌ Poor error messages
- ❌ Hard to validate

### After (json format)
- ✓ Native JSON parsing
- ✓ Clear structure
- ✓ Specific error messages
- ✓ Easy validation

## Backward Compatibility

The website accepts **both** formats:
- `.json` files (recommended - better validation)
- `.txt` files (still works - for convenience)

## Next Steps

1. **Test the website** with the JSON file to make sure everything works
2. **Decide on workflow**:
   - Will you convert student files for them?
   - Or have them submit JSON from the start?
3. **Share templates** with students:
   - Give them `surveys/formatted/FeatureSurveyTemplate2.json` to copy
   - Or give them `.txt` and the conversion script

## Files to Review

- 📄 `surveys/formatted/FeatureSurveyTemplate2.json` - The converted template
- 📄 `surveys/README.md` - Workflow options
- 📄 `CONVERSION_README.md` - Detailed documentation
- 🔧 `convert_survey.py` - Conversion script
- 🔧 `convert_all.sh` - Batch converter

## Testing Checklist

- [ ] Open index.html in browser
- [ ] Upload surveys/formatted/FeatureSurveyTemplate2.json
- [ ] Verify 3 features display correctly
- [ ] Select each feature and check details
- [ ] Try uploading surveys/original/FeatureSurveyTemplate2.txt (should also work)

Everything is ready to test!
