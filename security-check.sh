#!/bin/bash

# Security Validation Script for MindFlow Mental Health Platform
# Run this script before committing to ensure no sensitive data is included

echo "🔒 MindFlow Security Validation"
echo "==============================="

VIOLATIONS=0

# Check for database files
echo "📊 Checking for database files..."
if find . -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" | grep -v node_modules | head -5; then
    echo "❌ WARNING: Database files found! These contain sensitive data."
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo "✅ No database files found in staging area"
fi

# Check for sensitive JSON files
echo -e "\n📋 Checking for sensitive configuration files..."
SENSITIVE_FILES=(
    "therapists.json"
    "counselors.json" 
    "config.json"
    "config.local.json"
    "credentials.json"
)

for file in "${SENSITIVE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "❌ WARNING: Sensitive file found: $file"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
done

# Check for environment files
echo -e "\n🔐 Checking for environment files..."
if find . -name ".env*" | head -5; then
    echo "❌ WARNING: Environment files found! These may contain secrets."
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo "✅ No environment files found"
fi

# Check for log files
echo -e "\n📝 Checking for log files..."
if find . -name "*.log" | head -5; then
    echo "❌ WARNING: Log files found! These may contain sensitive information."
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo "✅ No log files found"
fi

# Check git status for staged sensitive files
echo -e "\n📦 Checking staged files..."
STAGED_SENSITIVE=$(git diff --cached --name-only | grep -E '\.(db|sqlite|log|env)$|therapists\.json|config\.json')
if [ ! -z "$STAGED_SENSITIVE" ]; then
    echo "❌ WARNING: Sensitive files staged for commit:"
    echo "$STAGED_SENSITIVE"
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo "✅ No sensitive files staged"
fi

# Summary
echo -e "\n📈 Security Validation Summary"
echo "==============================="
if [ $VIOLATIONS -eq 0 ]; then
    echo "✅ PASSED: No security violations found"
    echo "🚀 Safe to commit!"
    exit 0
else
    echo "❌ FAILED: $VIOLATIONS security violations found"
    echo "🛑 DO NOT COMMIT until violations are resolved"
    echo ""
    echo "💡 To fix:"
    echo "   - Remove sensitive files from staging: git reset HEAD <file>"
    echo "   - Add files to .gitignore if needed"
    echo "   - Use .example templates for configuration"
    exit 1
fi