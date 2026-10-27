#!/usr/bin/env bash
set -euo pipefail

echo "=== Running check-ownership.sh (§14.1) ==="

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# Check commits in git history
commits=$(git log --format="%H" 2>/dev/null || true)

if [ -z "$commits" ]; then
  echo "No commits yet to verify."
  exit 0
fi

violations=0

for commit in $commits; do
  msg=$(git log -1 --format="%B" "$commit")
  author=$(git log -1 --format="%an" "$commit")
  files=$(git show --pretty="" --name-only "$commit")

  is_builder=false
  is_tester=false

  if echo "$msg $author" | grep -iq "builder"; then
    is_builder=true
  fi

  if echo "$msg $author" | grep -iq "tester"; then
    is_tester=true
  fi

  has_builder_files=false
  has_tester_files=false

  for f in $files; do
    if [[ "$f" =~ ^(src/|public/|config/) ]]; then
      has_builder_files=true
    fi
    if [[ "$f" =~ ^(tests/|tools/|docs/TEST_REPORT\.md|docs/DEFECTS\.md) ]]; then
      has_tester_files=true
    fi
  done

  # Explicit role checks
  if [ "$is_builder" = true ]; then
    for f in $files; do
      if [[ "$f" =~ ^(tests/|tools/|docs/TEST_REPORT\.md|docs/DEFECTS\.md) ]]; then
        echo "VIOLATION in commit $commit: Builder touched restricted path: $f"
        violations=$((violations + 1))
      fi
    done
  fi

  if [ "$is_tester" = true ]; then
    for f in $files; do
      if [[ "$f" =~ ^(src/|public/|config/) ]]; then
        echo "VIOLATION in commit $commit: Tester touched restricted path: $f"
        violations=$((violations + 1))
      fi
    done
  fi

  # Simultaneous boundary crossing check for tagged commits
  if [ "$is_builder" = true ] && [ "$is_tester" = true ]; then
    echo "VIOLATION in commit $commit: Commit cannot claim both Builder and Tester roles"
    violations=$((violations + 1))
  fi
done

if [ $violations -gt 0 ]; then
  echo "FAILED: $violations ownership violations found."
  exit 1
fi

echo "SUCCESS: All commit ownership rules verified."
exit 0
