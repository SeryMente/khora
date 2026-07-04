const fs = require('fs');
const content = fs.readFileSync('lib/sync.ts', 'utf8');
const patched = content.replace(
  'const url = new URL(`${window.location.origin}${API_URL}/capturas`);\n\t\turl.searchParams.append("simularNotion", simularNotion.toString());\n\t\turl.searchParams.append("simulateError", simulateError.toString());',
  'const url = `${API_URL}/capturas?simularNotion=${simularNotion}&simulateError=${simulateError}`;'
);
fs.writeFileSync('lib/sync.ts', patched);
