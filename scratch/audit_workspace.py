import os
import re

all_files = []
for root, dirs, filenames in os.walk('.'):
    if any(x in root for x in ['node_modules', '.git', 'dist', '.next', 'build', 'scratch', 'test-results']):
        continue
    for file in filenames:
        if file.endswith(('.ts', '.tsx')):
            all_files.append(os.path.join(root, file))

print('=== 1. EXPORTED SYMBOLS USAGE AUDIT ===')
exports = []
for fp in all_files:
    clean_fp = fp.replace('\\', '/')
    with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Find exported functions, classes, consts
    matches = re.findall(r'export\s+(?:async\s+)?(?:function|class|const|type|interface)\s+([A-Za-z0-9_$]+)', content)
    for name in matches:
        if name in ['default', 'App', 'LandingPage', 'LobbyPage', 'MatchPage', 'ResultPage']:
            continue
        exports.append((clean_fp, name))

# Read all file contents into memory to search references
file_contents = {}
for fp in all_files:
    clean_fp = fp.replace('\\', '/')
    with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
        file_contents[clean_fp] = f.read()

unused_exports = []
for source_fp, name in exports:
    count = 0
    for fp, content in file_contents.items():
        if name in content:
            count += len(re.findall(r'\b' + re.escape(name) + r'\b', content))
    # If symbol only appears in its own declaration file (or nowhere else)
    self_count = len(re.findall(r'\b' + re.escape(name) + r'\b', file_contents[source_fp]))
    if count <= self_count:
        unused_exports.append((source_fp, name))

for fp, name in unused_exports:
    print(f'{fp}: Unused export "{name}" (never imported or referenced elsewhere)')

print('\n=== 2. MOCK / DUMMY DATA SCAN ===')
for fp, content in file_contents.items():
    lines = content.split('\n')
    for idx, line in enumerate(lines):
        if re.search(r'\b(mock|dummy|fake|hardcoded)\b', line, re.IGNORECASE):
            print(f'{fp}:{idx+1}: {line.strip()}')
