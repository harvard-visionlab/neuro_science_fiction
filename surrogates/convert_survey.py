#!/usr/bin/env python3
"""
Survey Format Converter
Converts old .txt format to new JSON format for feature surveys.

Usage:
    python convert_survey.py input.txt output.json
    python convert_survey.py input.txt  # Creates input.json
"""

import sys
import json
import re
from pathlib import Path


def parse_old_format(content):
    """Parse the old text-based survey format."""
    lines = [line.strip() for line in content.split('\n') if line.strip()]

    survey = {
        'year': None,
        'groupName': None,
        'features': []
    }

    current_feature = None

    for line in lines:
        if line.startswith('year:'):
            survey['year'] = line.split(':', 1)[1].strip()

        elif line.startswith('groupName:'):
            survey['groupName'] = line.split(':', 1)[1].strip()

        elif line.startswith('feature:'):
            # Save previous feature if exists
            if current_feature:
                survey['features'].append(current_feature)

            # Start new feature
            current_feature = {
                'name': line.split(':', 1)[1].strip(),
                'definition': '',
                'question': '',
                'type': '',
                'options': []
            }

        elif line.startswith('definition:') and current_feature:
            current_feature['definition'] = line.split(':', 1)[1].strip()

        elif line.startswith('question:') and current_feature:
            current_feature['question'] = line.split(':', 1)[1].strip()

        elif line.startswith('type:') and current_feature:
            current_feature['type'] = line.split(':', 1)[1].strip()

        elif re.match(r'^\d+:', line) and current_feature:
            # Parse option line
            match = re.match(r'^(\d+):\s*(.+)$', line)
            if match:
                value = int(match.group(1))
                label = match.group(2).strip()
                current_feature['options'].append({
                    'value': value,
                    'label': label
                })

    # Don't forget the last feature
    if current_feature:
        survey['features'].append(current_feature)

    # Clean up: remove empty options arrays for yesno type
    for feature in survey['features']:
        if feature['type'] == 'yesno' and not feature['options']:
            del feature['options']

    return survey


def validate_survey(survey):
    """Validate the survey structure."""
    errors = []

    if not survey.get('year'):
        errors.append("Missing 'year' field")

    if not survey.get('groupName'):
        errors.append("Missing 'groupName' field")

    if not survey.get('features') or len(survey['features']) == 0:
        errors.append("No features defined")

    for i, feature in enumerate(survey.get('features', [])):
        prefix = f"Feature {i+1} ({feature.get('name', 'unnamed')})"

        if not feature.get('name'):
            errors.append(f"{prefix}: Missing 'name'")

        if not feature.get('definition'):
            errors.append(f"{prefix}: Missing 'definition'")

        if not feature.get('question'):
            errors.append(f"{prefix}: Missing 'question'")

        if not feature.get('type'):
            errors.append(f"{prefix}: Missing 'type'")
        elif feature['type'] not in ['yesno', 'scale', 'checklist']:
            errors.append(f"{prefix}: Invalid type '{feature['type']}' (must be yesno, scale, or checklist)")

        # Validate options for scale and checklist
        if feature.get('type') in ['scale', 'checklist']:
            if not feature.get('options') or len(feature['options']) == 0:
                errors.append(f"{prefix}: Type '{feature['type']}' requires options")

    return errors


def convert_file(input_path, output_path=None):
    """Convert a survey file from old to new format."""
    input_path = Path(input_path)

    if not input_path.exists():
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        return False

    # Determine output path
    if output_path is None:
        output_path = input_path.with_suffix('.json')
    else:
        output_path = Path(output_path)

    # Read input file
    print(f"Reading {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Parse
    print("Parsing old format...")
    try:
        survey = parse_old_format(content)
    except Exception as e:
        print(f"Error parsing file: {e}", file=sys.stderr)
        return False

    # Validate
    print("Validating...")
    errors = validate_survey(survey)
    if errors:
        print("Validation errors found:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return False

    # Write output
    print(f"Writing {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(survey, f, indent=2, ensure_ascii=False)

    # Summary
    print(f"\n✓ Conversion successful!")
    print(f"  Year: {survey['year']}")
    print(f"  Group: {survey['groupName']}")
    print(f"  Features: {len(survey['features'])}")
    print(f"  Output: {output_path}")

    return True


def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_survey.py input.txt [output.json]")
        print("   or: python convert_survey.py input.txt  (creates input.json)")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    success = convert_file(input_path, output_path)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
