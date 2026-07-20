import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = await request.json();
    const { text, source } = payload;
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const kernelDir = path.resolve(process.cwd(), '../kernel/src');

    // We run the python script using a static string and pass user data via stdin safely as JSON.
    const pyScript = `
import sys
import json
import os
import uuid
sys.path.insert(0, r'${kernelDir}')

try:
    input_data = json.loads(sys.stdin.read())
    text = input_data.get('text', '')
    source = input_data.get('source', 'capturar')

    from khora_kernel.api import Provenance, ObjetoDeInformacion, ContextoDeVisibilidad, ResultadoDeConsulta, SubgrafoRelevante, NivelSuficiencia
    from khora_kernel.poblacion._ingestar import ingestar

    class MockMemoria:
        def buscar_entidades_candidatas(self, label_norm):
            return []
        def merge_entidad(self, canonical_key, label_original, provenance_raw, embedding, matiz_de=None, needs_review=False):
            pass
        def escribir_ingesta(self, triples, provenance):
            return len(triples)
        def frecuencia(self, canonical_key):
            return 0
        def linea_temporal(self, desde, hasta):
            return []
        def consultar(self, pregunta, contexto):
            return ResultadoDeConsulta(
                fragmentos=[],
                subgrafo=SubgrafoRelevante([], []),
                suficiencia=NivelSuficiencia.INSUFICIENTE,
                resumenes_incluidos=False
            )

    class MockLLM:
        def generar(self, solicitud):
            from khora_kernel.api import RespuestaLLM, Provenance
            prov = Provenance(origen='mock', driver=None, timestamp='2024-01-01T00:00:00Z')
            if "Extrae entidades" in solicitud.prompt:
                return RespuestaLLM(texto="User, talked_to, Juan\\nJuan, likes, Pizza", modelo="mock", provenance=prov)
            elif "Evalúa si la nueva entidad" in solicitud.prompt:
                return RespuestaLLM(texto="MERGE", modelo="mock", provenance=prov)
            return RespuestaLLM(texto="NO", modelo="mock", provenance=prov)

    class MockEmbeddings:
        def incrustar(self, textos):
            return [[0.0]*1024 for _ in textos]

    obj_id = str(uuid.uuid4())
    provenance = Provenance(origen=source, driver=None, timestamp='2024-01-01T00:00:00Z')
    objeto = ObjetoDeInformacion(id=obj_id, texto=text, provenance=provenance, metadata={})

    memoria = MockMemoria()
    puerto_llm = MockLLM()
    puerto_embeddings = MockEmbeddings()

    acta = ingestar(objeto, memoria, puerto_llm, puerto_embeddings)
    print(json.dumps({
        'status': 'ok',
        'id': obj_id,
        'acta': {
            'origen': acta.origen,
            'timestamp': acta.timestamp,
            'ideas_novedosas': acta.ideas_novedosas,
            'triples_escritos': acta.triples_escritos
        }
    }))
except Exception as e:
    import traceback
    print(json.dumps({'error': str(e), 'traceback': traceback.format_exc()}))
    sys.exit(1)
`;

    return new Promise<NextResponse>((resolve) => {
      const child = spawn('python', ['-c', pyScript]);

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('close', (code) => {
        try {
          const result = JSON.parse(stdoutData.trim());
          if (result.error) {
            resolve(NextResponse.json({ error: result.error, traceback: result.traceback }, { status: 500 }));
          } else {
            resolve(NextResponse.json(result));
          }
        } catch (err: any) {
          resolve(NextResponse.json({ error: 'Failed to parse python response', details: stdoutData, stderr: stderrData }, { status: 500 }));
        }
      });

      child.stdin.write(JSON.stringify({ text, source }));
      child.stdin.end();
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
