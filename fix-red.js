const fs = require('fs');
let code = fs.readFileSync('khora-web/app/sistema/consulta/page.tsx', 'utf8');

code = code.replace(/bg-red-50/g, 'bg-gray-50');
code = code.replace(/text-red-700/g, 'text-gray-700');

fs.writeFileSync('khora-web/app/sistema/consulta/page.tsx', code);
