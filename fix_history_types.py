import re

with open('kernel/src/khora_kernel/engine/history.py', 'r') as f:
    content = f.read()

# Fix types in history.py
content = content.replace('steps: List[HtStep] = field(default_factory=list)', 'steps: List[HtStep] = field(default_factory=list)')
content = content.replace('evidence: List[HtEvidence] = field(default_factory=list)', 'evidence: List[HtEvidence] = field(default_factory=list)')
content = content.replace('verdicts: List[Any] = field(default_factory=list)', 'verdicts: List[Any] = field(default_factory=list)')

# It turns out Pyright is complaining because `field(default_factory=list)` type inferences is sometimes tricky.
# Let's fix that.
content = content.replace('steps: List[HtStep] = field(default_factory=list)', 'steps: List[HtStep] = field(default_factory=lambda: [])')
content = content.replace('evidence: List[HtEvidence] = field(default_factory=list)', 'evidence: List[HtEvidence] = field(default_factory=lambda: [])')
content = content.replace('verdicts: List[Any] = field(default_factory=list)', 'verdicts: List[Any] = field(default_factory=lambda: [])')

# Remove Dict unused import
content = content.replace('from typing import List, Dict, Any, Optional', 'from typing import List, Any, Optional')

with open('kernel/src/khora_kernel/engine/history.py', 'w') as f:
    f.write(content)
