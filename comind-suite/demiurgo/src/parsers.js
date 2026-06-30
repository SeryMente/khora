// Parsers portados VERBATIM de background.js v3.32 (bgStrip/bgNum/bgISO/bgParseRow/selName).
// Misma logica exacta: no se reinventa el formato de fila del Call Log.
function bgStrip(v){ return v == null ? "" : String(v).replace(/<[^>]*>/g,"").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim(); }
function bgNum(v){ if(v == null) return null; if(typeof v === "number") return isNaN(v)?null:v; const s = String(v).replace(/[^0-9.\-]/g,""); if(s==="") return null; const n = Number(s); return isNaN(n)?null:n; }
function bgISO(dateStr, timeStr){
  try{
    if(!dateStr) return null;
    const dm = String(dateStr).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(!dm) return null;
    const mm = String(parseInt(dm[1],10)).padStart(2,"0");
    const dd = String(parseInt(dm[2],10)).padStart(2,"0");
    const yyyy = dm[3];
    let hh = "00", mi = "00";
    if(timeStr){
      const tm = String(timeStr).match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);
      if(tm){ let h = parseInt(tm[1],10); const ap = (tm[3]||"").toUpperCase(); if(ap==="PM"&&h<12)h+=12; if(ap==="AM"&&h===12)h=0; hh=String(h).padStart(2,"0"); mi=tm[2]; }
    }
    return yyyy+"-"+mm+"-"+dd+"T"+hh+":"+mi+":00";
  }catch(e){ return null; }
}
function bgParseRow(row){
  if(!row || typeof row !== "object" || Array.isArray(row)) return { id:null };
  const id = row.call_unique_identifier || row.callUniqueIdentifier || row.unique_identifier || null;
  const company = row.company != null ? bgStrip(row.company) : null;
  const service = row.service != null ? bgStrip(row.service) : null;
  return {
    id: id ? String(id).trim() : null,
    startISO: bgISO(row.date, row.start),
    end: row.end ? bgStrip(row.end) : null,
    minutes: bgNum(row.interpreter_minutes),
    company: company || null,
    service: service || "Telephone",
    units: bgNum(row.hourly_pay_units),
  };
}
// Notion NO permite comas en nombres de opciones de select (port de selName v3.32).
function selName(v){ return String(v == null ? "" : v).replace(/,/g," ").replace(/\s+/g," ").trim().slice(0,90); }
module.exports = { bgStrip, bgNum, bgISO, bgParseRow, selName };
