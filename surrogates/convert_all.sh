#!/bin/bash
#
# Batch convert all .txt survey files to .json format
#
# Usage:
#   ./convert_all.sh                    # Convert all .txt files in current directory
#   ./convert_all.sh /path/to/surveys   # Convert all .txt files in specified directory
#

set -e

# Determine directory to process
if [ $# -eq 0 ]; then
    SURVEY_DIR="."
else
    SURVEY_DIR="$1"
fi

# Check if directory exists
if [ ! -d "$SURVEY_DIR" ]; then
    echo "Error: Directory not found: $SURVEY_DIR"
    exit 1
fi

# Get the script directory (where convert_survey.py is located)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Converting surveys in: $SURVEY_DIR"
echo "Using converter: $SCRIPT_DIR/convert_survey.py"
echo ""

# Counter for statistics
total=0
success=0
failed=0

# Find all .txt files (excluding the template)
shopt -s nullglob
for txtfile in "$SURVEY_DIR"/*.txt; do
    # Skip the template file itself
    if [[ "$txtfile" == *"Template"* ]]; then
        echo "Skipping template: $(basename "$txtfile")"
        continue
    fi

    total=$((total + 1))
    jsonfile="${txtfile%.txt}.json"

    echo "Converting: $(basename "$txtfile")"

    # Run the converter
    if python3 "$SCRIPT_DIR/convert_survey.py" "$txtfile" "$jsonfile"; then
        success=$((success + 1))
        echo "  ✓ Created: $(basename "$jsonfile")"

        # Optionally backup the original
        if [ ! -f "${txtfile}.bak" ]; then
            cp "$txtfile" "${txtfile}.bak"
            echo "  ✓ Backed up original to: $(basename "${txtfile}.bak")"
        fi
    else
        failed=$((failed + 1))
        echo "  ✗ Failed to convert"
    fi
    echo ""
done

# Summary
echo "======================================"
echo "Conversion Summary"
echo "======================================"
echo "Total files processed: $total"
echo "Successfully converted: $success"
echo "Failed: $failed"
echo ""

if [ $success -gt 0 ]; then
    echo "✓ Your students can now use the .json files with the updated website!"
    echo "  (Original .txt files have been backed up with .bak extension)"
fi
