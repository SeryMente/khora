const fs = require('fs');
const content = fs.readFileSync('lib/sync.ts', 'utf8');
const patched = content.replace(
  'console.error("[pullServer] error details:", { message: e.message, stack: e.stack, url: `${API_URL}/capturas` }, e);',
  'console.error("[pullServer] error details:", { message: (e as any).message, url: `${API_URL}/capturas` }, e);'
);
fs.writeFileSync('lib/sync.ts', patched);
