const fs = require('fs');
const filePath = 'khora-web/e2e/shell-v2.spec.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Due to our changes, 'Acceso Restringido' is no longer immediately shown, it might show 'Configurar PIN' if the state is not initialized.
content = content.replace(
  "{ path: '/bitacora', expectedTitle: 'Acceso Restringido' }",
  "{ path: '/bitacora', expectedTitle: 'Configurar PIN' }"
);

fs.writeFileSync(filePath, content);
