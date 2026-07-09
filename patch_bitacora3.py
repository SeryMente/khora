import re

with open('khora-web/app/bitacora/page.tsx', 'r') as f:
    content = f.read()

import re
content = re.sub(r'\{false && \(\s*<ul className="text-red-400 list-disc pl-4 mt-2">\s*\{chainHealth.errors.map\(\(err, i\) => <li key=\{i\}>\{err\}</li>\)\}\s*</ul>\s*\)\}', '', content)


with open('khora-web/app/bitacora/page.tsx', 'w') as f:
    f.write(content)
