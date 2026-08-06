#!/bin/bash
# Update shell-v2.spec.ts
sed -i "s|{ path: '/bitacora', expectedTitle: 'Configurar PIN' }, // Ya que bitacora requiere pin, primero veremos el candado|{ path: '/sistema/dictado', expectedTitle: 'Dictado' },|" khora-web/e2e/shell-v2.spec.ts
sed -i "s|{ path: '/cabina', expectedTitle: 'Cabina' },|{ path: '/sistema/editar', expectedTitle: 'Editar transcripciones' },|" khora-web/e2e/shell-v2.spec.ts
sed -i "s|{ path: '/integracion', expectedTitle: 'Integración' },|{ path: '/sistema/volcados', expectedTitle: 'Volcados' },|" khora-web/e2e/shell-v2.spec.ts
sed -i "s|{ path: '/nucleo', expectedTitle: 'Núcleo' },|{ path: '/sistema/ingesta', expectedTitle: 'Ingesta' },|" khora-web/e2e/shell-v2.spec.ts
sed -i "s|{ path: '/prisma', expectedTitle: 'Prisma' },|{ path: '/sistema/consulta', expectedTitle: 'Consulta' },|" khora-web/e2e/shell-v2.spec.ts
sed -i "s|{ path: '/sistema', expectedTitle: 'Sistema' },|{ path: '/grafo', expectedTitle: 'Grafo' },|" khora-web/e2e/shell-v2.spec.ts
sed -i "s|{ path: '/preguntar', expectedTitle: 'Preguntar a la red' },|{ path: '/mapa', expectedTitle: 'Mapa' },|" khora-web/e2e/shell-v2.spec.ts
# Remove Capturar modal test from shell-v2
sed -i '/test('"'"'El Modal "Capturar" se abre y cierra correctamente'"'"'/,/});/d' khora-web/e2e/shell-v2.spec.ts

# Update bitacora-dictado.spec.ts
sed -i "s|await page.goto('/bitacora');|await page.goto('/sistema/dictado');|" khora-web/e2e/bitacora-dictado.spec.ts
sed -i "s|const textarea = page.locator('textarea').first();|const textarea = page.locator('input[placeholder=\"titulo opcional\"]').first();|" khora-web/e2e/bitacora-dictado.spec.ts
sed -i "s|name: /Dictar entrada\|Detener/i|name: /Iniciar dictado\|Detener/i|" khora-web/e2e/bitacora-dictado.spec.ts
sed -i "s|name: /Dictar entrada/i|name: /Iniciar dictado/i|" khora-web/e2e/bitacora-dictado.spec.ts
sed -i "s| || await page.getByRole('button', { name: /Dictado no soportado/i }).isVisible()||" khora-web/e2e/bitacora-dictado.spec.ts

# Update smoke.spec.ts
sed -i "s|await page.goto('/sistema');|await page.goto('/capturar');|" khora-web/tests/regression/smoke.spec.ts
sed -i "/const captureButton = page.locator('button:has-text(\"Capturar\")').first();/d" khora-web/tests/regression/smoke.spec.ts
sed -i "/await captureButton.waitFor({ state: 'visible' });/d" khora-web/tests/regression/smoke.spec.ts
sed -i "/await captureButton.click();/d" khora-web/tests/regression/smoke.spec.ts
sed -i "s|h2:has-text(\"Capturar en Bitácora\")|h2:has-text(\"Ingesta de Información\")|" khora-web/tests/regression/smoke.spec.ts
sed -i "s|textarea\[placeholder=\"Escribe o dicta tu entrada aquí...\"\]|textarea[placeholder=\"Escribe o pega aquí la información...\"]|" khora-web/tests/regression/smoke.spec.ts
sed -i "s|Flujo de captura de bitácora acepta entrada|Flujo de captura acepta entrada|" khora-web/tests/regression/smoke.spec.ts

# Update second test in smoke.spec.ts
sed -i "s|await page.goto('/sistema');|await page.goto('/sistema/dictado');|" khora-web/tests/regression/smoke.spec.ts
sed -i "s|button\[title=\"Iniciar dictado\"\], button\[title=\"Dictado no soportado en este navegador\"\]|button:has-text(\"Iniciar dictado\")|" khora-web/tests/regression/smoke.spec.ts
