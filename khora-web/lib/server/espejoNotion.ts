// @l0 L0-002-R · @req FIX-DICTADO/ESPEJO-NOTION · @acr ACR-1.2

function formatFechaLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function subdividirParrafo(p: string): string[] {
  const chunks: string[] = [];
  let rem = p;
  while (rem.length > 1900) {
    let cutIndex = rem.lastIndexOf(" ", 1900);
    if (cutIndex <= 0) {
      cutIndex = 1900;
    }
    chunks.push(rem.slice(0, cutIndex));
    rem = rem.slice(cutIndex).trimStart();
  }
  if (rem.length > 0) {
    chunks.push(rem);
  }
  return chunks;
}

function chunkText(text: string): string[] {
  const paragraphs = text.split(/\r?\n/);
  const blocks: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= 1900) {
      blocks.push(p);
    } else {
      blocks.push(...subdividirParrafo(p));
    }
  }
  return blocks;
}

export interface DatosEspejo {
  texto: string;
  titulo?: string | null;
  volcado_id: string;
  version: number;
  sha256: string;
  fecha?: string | null;
  caracteres: number;
  audio?: string | null;
  partesAudio?: number | null;
  pulidoAplicado?: boolean | null;
  reconexiones?: number | null;
}

export async function espejarVolcado(datos: DatosEspejo): Promise<void> {
  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_DB_VOLCADOS;

  if (!token || !dbId) {
    return;
  }

  let fechaDictadoStr = datos.fecha || null;
  let sufijoFechaArchivado = false;
  if (!fechaDictadoStr) {
    fechaDictadoStr = new Date().toISOString();
    sufijoFechaArchivado = true;
  }

  let tituloFinal = datos.titulo?.trim() || "";
  if (!tituloFinal) {
    const dObj = new Date(fechaDictadoStr);
    const validDate = isNaN(dObj.getTime()) ? new Date() : dObj;
    tituloFinal = "Volcado " + formatFechaLocal(validDate);
  }

  if (sufijoFechaArchivado) {
    tituloFinal += " (fecha de archivado)";
  }

  const properties: any = {
    "Título": {
      title: [
        {
          text: {
            content: tituloFinal
          }
        }
      ]
    },
    "volcado_id": {
      rich_text: [
        {
          text: {
            content: datos.volcado_id
          }
        }
      ]
    },
    "version": {
      number: datos.version
    },
    "sha256": {
      rich_text: [
        {
          text: {
            content: datos.sha256
          }
        }
      ]
    },
    "Fecha del dictado": {
      date: {
        start: fechaDictadoStr
      }
    },
    "Caracteres": {
      number: datos.caracteres
    },
    "Estado de ingesta": {
      select: {
        name: "Archivado"
      }
    }
  };

  if (datos.audio) {
    properties["Audio"] = {
      url: datos.audio
    };
  }

  if (datos.partesAudio !== undefined && datos.partesAudio !== null) {
    properties["Partes de audio"] = {
      number: datos.partesAudio
    };
  }

  if (datos.pulidoAplicado !== undefined && datos.pulidoAplicado !== null) {
    properties["Pulido aplicado"] = {
      checkbox: datos.pulidoAplicado
    };
  }

  if (datos.reconexiones !== undefined && datos.reconexiones !== null) {
    properties["Reconexiones"] = {
      number: datos.reconexiones
    };
  }

  const textChunks = chunkText(datos.texto);
  const children = textChunks.map((chunk) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: {
            content: chunk
          }
        }
      ]
    }
  }));

  const payload = {
    parent: {
      database_id: dbId
    },
    properties,
    children
  };

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${errorText}`);
  }
}
