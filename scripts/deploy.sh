#!/bin/bash
# Deploy built files to the 'deploy' branch for Cloudways Git deployment
set -e
export PATH="/opt/homebrew/bin:./node_modules/.bin:$PATH"

echo "🔨 Building site..."
bun run build

echo "📦 Deploying to 'deploy' branch..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
DEPLOY_DIR=$(mktemp -d)
cp -r dist/. "$DEPLOY_DIR/"

# Back up node_modules so branch switch doesn't destroy it
NODE_MODULES_BAK=$(mktemp -d)
mv node_modules "$NODE_MODULES_BAK/node_modules"

if git show-ref --verify --quiet refs/heads/deploy; then
  git checkout deploy
else
  git checkout --orphan deploy
  git rm -rf . 2>/dev/null || true
fi

# Clean current contents and copy built files
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +
cp -r "$DEPLOY_DIR"/. .
rm -rf "$DEPLOY_DIR"

git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')" --allow-empty
git push origin deploy --force

echo "✅ Deployed! Switching back to $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH"

# Restore node_modules
mv "$NODE_MODULES_BAK/node_modules" ./node_modules
rm -rf "$NODE_MODULES_BAK"

echo "🎉 Done!"
