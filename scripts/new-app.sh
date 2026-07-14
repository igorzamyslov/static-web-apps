#!/usr/bin/env bash
# Scaffold a new plain static app:  scripts/new-app.sh <name>
set -euo pipefail

name="${1:-}"
if [ -z "$name" ]; then
  echo "usage: scripts/new-app.sh <name>"
  exit 1
fi

dir="apps/$name"
if [ -e "$dir" ]; then
  echo "apps/$name already exists"
  exit 1
fi

mkdir -p "$dir"

cat > "$dir/app.json" <<JSON
{
  "title": "$name",
  "description": ""
}
JSON

cat > "$dir/index.html" <<HTML
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>$name</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <main>
    <h1>$name</h1>
    <p>Edit <code>apps/$name/index.html</code> to get started.</p>
    <p><a href="../">&larr; All apps</a></p>
  </main>
</body>
</html>
HTML

cat > "$dir/styles.css" <<'CSS'
body { font: 16px/1.5 system-ui, sans-serif; margin: 0; }
main { max-width: 640px; margin: 0 auto; padding: 3rem 1.25rem; }
CSS

echo "Created $dir"
echo "Preview locally:  npx serve $dir"
echo "For a build step instead, add a package.json with a \"build\" script that outputs to dist/."
