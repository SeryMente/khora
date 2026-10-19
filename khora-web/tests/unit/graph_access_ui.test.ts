import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const read=(p:string)=>fs.readFileSync(path.join(process.cwd(),p),"utf8");
test("graph reading has no vault factor, mutations retain it",()=>{const s=read("app/api/grafos/route.ts");assert.match(s,/identity\(req,false\)/);assert.match(s,/requireVault=true/);assert.match(s,/requireVault\s*&&\s*!desbloqueoVigente/);assert.match(s,/POST\(req:NextRequest\)[\s\S]*?identity\(req\)/);assert.match(s,/origin_required/);assert.match(s,/no_autenticado/);});
test("idle PIN exemption is confined to graph route",()=>{const s=read("app/components/AutoLockProvider.tsx");assert.match(s,/usePathname\(\) === "\/grafo"/);assert.match(s,/if \(graphReading\) return/);assert.match(s,/locked && !graphReading/);assert.match(s,/api\/security\/lock/);});
test("compact graph retains distinct human review and traceability",()=>{const s=read("app/grafo/page.tsx");assert.match(s,/Propuestas del sistema · sin ratificación humana/);assert.match(s,/Relaciones ratificadas por ti/);assert.match(s,/<View compact/);assert.match(s,/<details className="graph-method"/);assert.match(s,/Ratificar identidad/);assert.match(s,/Ratificar relación y extremos/);assert.match(s,/No se han modificado ni aprobado/);});
