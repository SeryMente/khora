import re

with open('khora-web/app/bitacora/page.tsx', 'r') as f:
    content = f.read()

content = content.replace('chainHealth.isHealthy', 'chainHealth.ok')
content = content.replace('chainHealth.checkedCount', 'capturas.length')
content = content.replace('chainHealth.brokenAtIndex', 'chainHealth.brokenAtSecuencia')
content = content.replace('chainHealth.errors && chainHealth.errors.length > 0', 'false')

# We can also just adjust it more cleanly:
new_health_block = """
                  <>
                    <p><strong>Estado:</strong> {chainHealth.ok ? '✅ Íntegro' : '❌ Corrupción detectada'}</p>
                    <p><strong>Mensaje:</strong> {chainHealth.message}</p>
                    {!chainHealth.ok && chainHealth.brokenAtSecuencia !== undefined && (
                      <p className="text-red-400"><strong>Rotura detectada en secuencia:</strong> {chainHealth.brokenAtSecuencia}</p>
                    )}
                  </>
"""
import re

# We will just rewrite the condition
old_health = """<>
                    <p><strong>Estado:</strong> {chainHealth.isHealthy ? '✅ Íntegro' : '❌ Corrupción detectada'}</p>
                    <p><strong>Verificados:</strong> {chainHealth.checkedCount} registros</p>
                    {!chainHealth.isHealthy && chainHealth.brokenAtIndex !== undefined && (
                      <p className="text-red-400"><strong>Rotura detectada en índice:</strong> {chainHealth.brokenAtIndex}</p>
                    )}
                    {chainHealth.errors && chainHealth.errors.length > 0 && (
                      <ul className="text-red-400 list-disc pl-4 mt-2">
                        {chainHealth.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    )}
                  </>"""

content = content.replace(old_health, new_health_block)

with open('khora-web/app/bitacora/page.tsx', 'w') as f:
    f.write(content)
