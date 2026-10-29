"use client";
import { BookOpen, FileText, Info, Languages, MessagesSquare, type LucideIcon } from "lucide-react";
import { type ClasificacionEntrada, TIPOS_ENTRADA } from "../../../lib/custodia/editorial";
import s from "./ingreso-studio.module.css";

const labels: Record<ClasificacionEntrada["tipoEntrada"], string> = {
  general: "Entrada general",
  conversacion_maya: "Conversación con Maya",
  interpretacion_simultanea: "Interpretación consecutiva",
  blog_personal: "Crónica personal",
};

const iconos: Record<ClasificacionEntrada["tipoEntrada"], LucideIcon> = {
  general: FileText,
  conversacion_maya: MessagesSquare,
  interpretacion_simultanea: Languages,
  blog_personal: BookOpen,
};

export function TipoEntradaControl({ value, onChange, disabled = false }: { value: ClasificacionEntrada; onChange: (value: ClasificacionEntrada) => void; disabled?: boolean }) {
  const cronica = value.tipoEntrada === "blog_personal";
  const seleccionar = (tipo: ClasificacionEntrada["tipoEntrada"]) => {
    if (!disabled && tipo !== value.tipoEntrada) onChange({ ...value, tipoEntrada: tipo });
  };
  const privacidad = (
    <label className={s.entryPrivacy}>
      <input disabled={disabled} data-ui-id="ingreso.ofuscada" type="checkbox" checked={value.ofuscada} onChange={(e) => onChange({ ...value, ofuscada: e.target.checked })} /> Entrada ofuscada
    </label>
  );
  const moverFoco = (e: React.KeyboardEvent<HTMLButtonElement>, indice: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const paso = e.key === "ArrowRight" ? 1 : -1;
    const siguiente = TIPOS_ENTRADA[(indice + paso + TIPOS_ENTRADA.length) % TIPOS_ENTRADA.length];
    seleccionar(siguiente);
    const grupo = e.currentTarget.parentElement;
    requestAnimationFrame(() => grupo?.querySelector<HTMLButtonElement>(`[data-tipo="${siguiente}"]`)?.focus());
  };

  return (
    <fieldset className={`${s.entryClassification} ${cronica ? s.entryCompact : ""}`}>
      <legend className={s.srOnly}>Tipo de entrada</legend>
      <div className={s.entrySelectRow} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div role="radiogroup" aria-label="Tipo de entrada" data-ui-id="ingreso.tipo-entrada" data-value={value.tipoEntrada} style={{ display: "inline-flex", gap: 4 }}>
          {TIPOS_ENTRADA.map((tipo, i) => {
            const Icono = iconos[tipo];
            const activo = value.tipoEntrada === tipo;
            return (
              <button
                key={tipo}
                type="button"
                role="radio"
                aria-checked={activo}
                aria-label={labels[tipo]}
                title={labels[tipo]}
                data-tipo={tipo}
                data-ui-id={`ingreso.tipo-entrada.${tipo}`}
                tabIndex={activo ? 0 : -1}
                disabled={disabled}
                onClick={() => seleccionar(tipo)}
                onKeyDown={(e) => moverFoco(e, i)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  border: "1px solid currentColor",
                  background: activo ? "currentColor" : "transparent",
                  color: "inherit",
                  opacity: disabled ? 0.5 : activo ? 1 : 0.65,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                <Icono size={20} style={activo ? { filter: "invert(1)" } : undefined} aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <span aria-live="polite" style={{ fontSize: 13, opacity: 0.85 }}>{labels[value.tipoEntrada]}</span>
        {cronica && (
          <details
            className={s.cronicaHelp}
            data-ui-id="ingreso.cronica-ayuda"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.currentTarget.open = false;
                e.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary aria-label="Ayuda sobre la crónica personal" title="Ayuda sobre la crónica personal">
              <Info size={19} />
              <span className={s.srOnly}>Ayuda sobre la crónica personal</span>
            </summary>
            <div className={s.cronicaHelpBody} role="note" aria-label="Sobre la crónica personal">
              <strong>Tu día, en tus palabras</strong>
              <p>Empieza a dictar sin preparar nada. Las pistas de momento, lugar y actividad se apartan cuando encuentran una mención en tu relato. Son orientativas: no verifican lo ocurrido ni son requisitos.</p>
              <p>Puedes cambiar de tema, dejar cosas abiertas y contar todo lo que quieras. No se completan datos ausentes ni necesitas dar una dirección exacta.</p>
              <p>Si te sirven, también puedes contar el contexto, cómo lo viviste, qué significa para ti o qué queda pendiente. Ninguna guía obliga a responder todo.</p>
              <p>La detección es local, por expresiones del texto; puede pasar por alto una mención. «Archivar registro» conserva el original. Publicar en el blog y Facebook exige después revisar y autorizar el texto exacto; no se publica audio.</p>
              {privacidad}
              {value.ofuscada && <p>La marca es privada y afecta a toda la entrada. No cifra ni anonimiza su texto.</p>}
            </div>
          </details>
        )}
      </div>
      {cronica ? (
        value.ofuscada && <span className={s.privateBadge}>Entrada ofuscada · marca privada</span>
      ) : (
        <>
          {privacidad}
          <p>{value.tipoEntrada === "interpretacion_simultanea" ? "Proyecto lateral: conservar no autoriza incorporar este contenido al grafo personal." : "Conservar y archivar no autoriza publicación ni ingesta automática."}</p>
          {value.ofuscada && <p>La marca es privada y afecta a toda la entrada. No cifra ni anonimiza su texto.</p>}
        </>
      )}
    </fieldset>
  );
}
