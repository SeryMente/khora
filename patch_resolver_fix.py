with open("kernel/src/khora_kernel/resolucion/_resolver.py", "r") as f:
    content = f.read()

# Fix the duplicate resolution issue. The memory search might be returning itself after the first run,
# and if the judge returns MATIZ or MERGE when it's exactly the same, it creates duplicates or weirdness.
# Actually, the memory object holds state. When we resolve "Target", it saves it.
# The next time we resolve "Target", memory returns "target". The judge says MERGE.
# But wait, why is it creating 'target_matiz_target'? Because the judge said MATIZ?
# Ah, I see: `elif "matiz" in prompt_lower: texto = "MATIZ"`. The prompt contains "Contexto: Actúa como destino en: Sarah con relación protects". This doesn't contain "matiz".
# But maybe there's a MATIZ triggered?

import re
# Let's override the judge mock strictly to only say MATIZ when "matiz" is in the new entity or context explicitly.
pass
