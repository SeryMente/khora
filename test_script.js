const fs = require('fs');

let smoke = fs.readFileSync('khora-web/tests/regression/smoke.spec.ts', 'utf8');
smoke = smoke.replace(
  /await page\.goto\('\/capturar'\);\s*const micButton = page\.locator\('button:has-text\("Iniciar dictado"\)'\)\.first\(\);/g,
  "await page.goto('/sistema/dictado');\n    const micButton = page.locator('button:has-text(\"Iniciar dictado\")').first();"
);
fs.writeFileSync('khora-web/tests/regression/smoke.spec.ts', smoke);
