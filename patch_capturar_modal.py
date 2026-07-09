import re

with open('khora-web/app/components/CapturarModal.tsx', 'r') as f:
    content = f.read()

# Replace:
#         duracionFinal !== undefined ? "voice" : "text",
# With:
#         "nota",
#         duracionFinal !== undefined ? "voice" : "keyboard",
content = content.replace('duracionFinal !== undefined ? "voice" : "text",', '"nota",\n        duracionFinal !== undefined ? "voice" : "keyboard",')

with open('khora-web/app/components/CapturarModal.tsx', 'w') as f:
    f.write(content)
