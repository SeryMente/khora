import re

with open('kernel/tests/consulta/test_retriever.py', 'r') as f:
    content = f.read()

# Add ResultadoDeConsulta to the first khora_kernel.api import
content = re.sub(r'from khora_kernel\.api import \(\n', r'from khora_kernel.api import (\n    ResultadoDeConsulta,\n', content, count=1)

# Remove the late imports and move them to the top
content = content.replace('import khora_kernel.embeddings\n', '')
content = content.replace('import os\n', '')

content = 'import os\nimport khora_kernel.embeddings\n' + content

with open('kernel/tests/consulta/test_retriever.py', 'w') as f:
    f.write(content)
