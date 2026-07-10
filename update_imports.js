const fs = require('fs');
const filePath = 'khora-web/app/bitacora/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const importAuth = `import { checkAuthSession, setAuthSession } from "@/lib/auth";\n`;
const importCrypto = `import { hasCryptoState, verifyPIN } from "@/lib/crypto";\n`;

// Add imports near other custom imports
content = content.replace(/import \{ useCapturas \} from "@\/lib\/hooks";/, `${importAuth}${importCrypto}import { useCapturas } from "@/lib/hooks";`);

fs.writeFileSync(filePath, content);
