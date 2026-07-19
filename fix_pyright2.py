import re

with open('kernel/src/khora_kernel/engine/fval.py', 'r') as f:
    content = f.read()

# Fix the type of evaluated_claims from List[str] to List[Dict[str, Any]]
content = content.replace('evaluated_claims: List[str] = []', 'evaluated_claims: List[Dict[str, Any]] = []')

# Fix datetime.UTC to timezone.utc
content = content.replace('from datetime import datetime', 'from datetime import datetime, timezone')
content = content.replace('datetime.now(datetime.UTC)', 'datetime.now(timezone.utc)')

with open('kernel/src/khora_kernel/engine/fval.py', 'w') as f:
    f.write(content)
