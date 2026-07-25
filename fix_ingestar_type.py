import re

with open("kernel/src/khora_kernel/poblacion/_ingestar.py", "r") as f:
    content = f.read()

content = content.replace("def ingestar(", "def ingestar(\n")
content = content.replace("on_upsert=None,", "on_upsert: Optional[Any] = None,")

with open("kernel/src/khora_kernel/poblacion/_ingestar.py", "w") as f:
    f.write(content)
