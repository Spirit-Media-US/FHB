#!/bin/bash
cd /Users/kevinwhite/sites/spirit-media-publishing

# Show what's changed
echo ""
echo "📋 Changes since last push:"
git status --short
echo ""

# Count changed files
CHANGES=$(git status --short | wc -l | tr -d ' ')

if [ "$CHANGES" = "0" ]; then
  echo "✅ Nothing to push — working tree is clean."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 0
fi

# Ask for confirmation
read -p "🚀 Push $CHANGES changed file(s) to live site? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Push cancelled. Changes saved locally."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 0
fi

# Ask for commit message
read -p "📝 Describe your changes (or press Enter for default): " MSG
if [ -z "$MSG" ]; then
  MSG="Site updates $(date '+%b %d %I:%M %p')"
fi

# Commit and push
git add -A
git commit -m "$MSG"
git push

echo ""
echo "✅ Done! Your site is live in about 60 seconds."
echo ""
echo "💡 Tip: Preview changes locally first with 'npm run dev'"
echo "   to avoid unnecessary pushes."
echo ""
read -n 1 -s -r -p "Press any key to close..."
