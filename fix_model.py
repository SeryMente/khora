import re

with open('kernel/src/khora_kernel/engine/fval.py', 'r') as f:
    content = f.read()

# Add KHORA_JUDGE_MODEL logic to SolicitudLLM metadata
content = re.sub(
    r'metadata=\{"temperature": 0.0\}',
    'metadata={"temperature": 0.0, "model": os.environ.get("KHORA_JUDGE_MODEL", "default")}',
    content
)

# Remove the commented out model line
content = re.sub(r'\s*# model = os.environ.get\("KHORA_JUDGE_MODEL", "default"\)\n', '\n', content)

with open('kernel/src/khora_kernel/engine/fval.py', 'w') as f:
    f.write(content)
