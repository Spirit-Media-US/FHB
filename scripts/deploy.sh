#!/bin/bash
# Deploy built files to the 'deploy' branch for Cloudways Git deployment
set -e

echo "🔨 Building site..."
bun run build

echo "📦 Deploying to 'deploy' branch..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
DEPLOY_DIR=$(mktemp -d)
cp -r dist/* "$DEPLOY_DIR/"

if git show-ref --verify --quiet refs/heads/deploy; then
  git checkout deploy
else
  git checkout --orphan deploy
  git rm -rf . 2>/dev/null || true
fi

# Clean current contents and copy built files
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +
cp -r "$DEPLOY_DIR"/* .
rm -rf "$DEPLOY_DIR"

git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')" --allow-empty
git push origin deploy --force

echo "✅ Deployed! Switching back to $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH"
echo "🎉 Done!"
