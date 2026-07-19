import re

with open('kernel/src/khora_kernel/engine/fval.py', 'r') as f:
    content = f.read()

# Fix utcnow
content = content.replace('datetime.utcnow().isoformat()', 'datetime.now(datetime.UTC).isoformat()')

# Add missing type hints for claims list
content = content.replace('claims = []', 'claims: List[str] = []')
content = content.replace('evaluated_claims = []', 'evaluated_claims: List[Dict[str, Any]] = []')

with open('kernel/src/khora_kernel/engine/fval.py', 'w') as f:
    f.write(content)
