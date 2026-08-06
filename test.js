const fs = require('fs');
let code = fs.readFileSync('khora-web/app/sistema/consulta/page.tsx', 'utf8');

// Replace green, amber, red, indigo, orange
code = code.replace(/bg-green-100/g, 'bg-gray-100');
code = code.replace(/text-green-800/g, 'text-gray-800');
code = code.replace(/border-green-200/g, 'border-gray-200');
code = code.replace(/bg-green-500/g, 'bg-gray-500');

code = code.replace(/bg-amber-100/g, 'bg-gray-100');
code = code.replace(/text-amber-800/g, 'text-gray-800');
code = code.replace(/border-amber-200/g, 'border-gray-200');
code = code.replace(/bg-amber-500/g, 'bg-gray-500');

code = code.replace(/bg-red-100/g, 'bg-gray-100');
code = code.replace(/text-red-800/g, 'text-gray-800');
code = code.replace(/border-red-200/g, 'border-gray-200');
code = code.replace(/bg-red-500/g, 'bg-gray-500');

code = code.replace(/bg-orange-50/g, 'bg-gray-50');
code = code.replace(/bg-orange-900\/20/g, 'bg-gray-900/20');
code = code.replace(/border-orange-500/g, 'border-gray-500');
code = code.replace(/text-orange-800/g, 'text-gray-800');
code = code.replace(/text-orange-300/g, 'text-gray-300');
code = code.replace(/text-orange-700/g, 'text-gray-700');
code = code.replace(/text-orange-400/g, 'text-gray-400');

code = code.replace(/text-indigo-700/g, 'text-gray-700');
code = code.replace(/text-indigo-400/g, 'text-gray-400');
code = code.replace(/bg-indigo-50/g, 'bg-gray-50');
code = code.replace(/bg-indigo-900\/30/g, 'bg-gray-900/30');

// Remove animation
code = code.replace(/animate-pulse/g, '');
code = code.replace(/animate-ping/g, '');

// Replace texts
code = code.replace(/Evidencia del Razonamiento/g, 'Fuentes');
code = code.replace(/NO-ANCLADA/g, 'Sin anclaje');
code = code.replace(/Suficiencia Confirmada/g, 'Con evidencia suficiente');
code = code.replace(/Suficiencia Parcial \/ Dudosa/g, 'Sin evidencia suficiente');


// Logic for suficiencia ausente y respuesta null
// Buscamos:
//           {/* Header con badges */}
//           <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center bg-gray-50 dark:bg-gray-900/50">
//             {resultado.suficiencia ? (
let blockToReplace = `          {/* Header con badges */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center bg-gray-50 dark:bg-gray-900/50">
            {resultado.suficiencia ? (`;

let replacementBlock = `          {typeof resultado.suficiencia !== "boolean" && (
            <div className="p-6 text-center text-gray-500">
              Contrato incompleto
            </div>
          )}
          {typeof resultado.suficiencia === "boolean" && (
            <>
              {/* Header con badges */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center bg-gray-50 dark:bg-gray-900/50">
                {resultado.suficiencia ? (`;
code = code.replace(blockToReplace, replacementBlock);


// Respuesta
let respuestaBlock = `          {/* Respuesta principal */}
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Respuesta</h3>
            <div className="prose dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
              <p className="whitespace-pre-wrap">{resultado.respuesta}</p>
            </div>
          </div>`;

let newRespuestaBlock = `          {/* Respuesta principal */}
          {resultado.respuesta !== null && (
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Respuesta</h3>
              <div className="prose dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
                <p className="whitespace-pre-wrap">{resultado.respuesta}</p>
              </div>
            </div>
          )}`;
code = code.replace(respuestaBlock, newRespuestaBlock);

// Fuentes vacias
let fuentesBlock = `{/* Panel de Evidencia */}
          {resultado.evidencia && resultado.evidencia.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700">`;

let newFuentesBlock = `{/* Panel de Evidencia */}
          <div className="border-t border-gray-200 dark:border-gray-700">`;
code = code.replace(fuentesBlock, newFuentesBlock);

let countBlock = `<span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs py-0.5 px-2 rounded-full">
                    {resultado.evidencia.length}
                  </span>`;
let newCountBlock = `<span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs py-0.5 px-2 rounded-full">
                    {resultado.evidencia ? resultado.evidencia.length : 0}
                  </span>`;
code = code.replace(countBlock, newCountBlock);


let panelBlock = `              {evidenciaAbierta && (
                <div className="px-6 pb-6 pt-2 bg-gray-50 dark:bg-gray-800/50">
                  <div className="space-y-4">
                    {resultado.evidencia.map((ev, index) => (`;
let newPanelBlock = `              {evidenciaAbierta && (
                <div className="px-6 pb-6 pt-2 bg-gray-50 dark:bg-gray-800/50">
                  {(!resultado.evidencia || resultado.evidencia.length === 0) ? (
                    <div className="text-gray-500 text-sm">No se encontraron fuentes</div>
                  ) : (
                    <div className="space-y-4">
                      {resultado.evidencia.map((ev, index) => (`;
code = code.replace(panelBlock, newPanelBlock);

let mapEndBlock = `                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>`;
let newMapEndBlock = `                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              )}
            </div>
            </>
          )}
        </div>`;
code = code.replace(mapEndBlock, newMapEndBlock);

fs.writeFileSync('khora-web/app/sistema/consulta/page.tsx', code);
