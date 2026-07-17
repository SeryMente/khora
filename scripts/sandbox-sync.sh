#!/usr/bin/env bash
# Tarea SBX-02: [URL_TAREA_SBX-02]

set -e

echo "=> Fetching origin..."
git fetch origin

# Get the latest open PR from Jules
PR_DATA=$(gh pr list --author app/jules --state open -L 1 --json number,headRefName,title --jq 'if length > 0 then "\(.[0].number)\t\(.[0].headRefName)\t\(.[0].title)" else "" end')

if [ -z "$PR_DATA" ]; then
    echo "=> Error: No hay ningún PR abierto de Jules (app/jules)."
    exit 1
fi

# Parse the tab-separated data
IFS=$'\t' read -r PR_NUMBER PR_BRANCH PR_TITLE <<< "$PR_DATA"

echo "=> Haciendo checkout de la rama: $PR_BRANCH (PR #$PR_NUMBER)"
git checkout "$PR_BRANCH"

echo ""
echo "=== Sincronización completada ==="
echo "PR Número: $PR_NUMBER"
echo "Rama: $PR_BRANCH"
echo "Título: $PR_TITLE"
echo "Instrucciones: cd khora-web && npm run dev"
echo "================================="
