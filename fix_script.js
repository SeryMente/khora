const fs = require('fs');
const filePath = 'khora-web/app/bitacora/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const searchStr = `          </div>
        </header>`;

const replaceStr = `            </div>
          </div>
        </header>`;

content = content.replace(searchStr, replaceStr);
fs.writeFileSync(filePath, content);
