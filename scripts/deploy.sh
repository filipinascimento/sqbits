#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
deploy_dir=$(mktemp -d)
trap 'rm -rf "$deploy_dir"' EXIT
cp -a dist/. "$deploy_dir/"
touch "$deploy_dir/.nojekyll"
git -C "$deploy_dir" init -b gh-pages -q
git -C "$deploy_dir" config user.name "$(git config user.name)"
git -C "$deploy_dir" config user.email "$(git config user.email)"
git -C "$deploy_dir" add .
git -C "$deploy_dir" commit -qm 'Publish SQbits static website'
git -C "$deploy_dir" push --force "$(git remote get-url origin)" HEAD:gh-pages
