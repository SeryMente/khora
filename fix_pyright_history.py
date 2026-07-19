import re

with open('kernel/src/khora_kernel/engine/history.py', 'r') as f:
    content = f.read()

# Fix utcnow warnings inside history.py
content = content.replace('from datetime import datetime', 'from datetime import datetime, timezone')
content = content.replace('datetime.utcnow().isoformat()', 'datetime.now(timezone.utc).isoformat()')

with open('kernel/src/khora_kernel/engine/history.py', 'w') as f:
    f.write(content)
