// @l0 L0-002 · @req LLAVERO/UI · Shared production/review view; no secret handling.
"use client";

import { ArrowDownToLine, ArrowRight, FileLock2, Info, KeyRound, Laptop, ShieldAlert, Smartphone } from "lucide-react";
import styles from "./PortableVaultView.module.css";

export type PortableVaultState = "pending" | "unavailable";
export interface PortableVaultViewProps { state?: PortableVaultState }

/** Fail closed: no enrollment, credentials, downloads or capability claims until a verified adapter exists. */
export function PortableVaultView({ state = "pending" }: PortableVaultViewProps) {
  const unavailable = state === "unavailable";
  return <section className={styles.root} aria-labelledby="portable-vault-title" data-ui-id="portable-vault.container">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>KHORA / SEGURIDAD</p>
        <h1 id="portable-vault-title">Bóveda portable</h1>
        <p className={styles.intro}>Tus archivos, cifrados contigo.<br />Una autorización nueva para cada apertura.</p>
      </div>
      <span className={styles.badge} data-ui-id="portable-vault.status"><span aria-hidden="true" />{unavailable ? "Servicio no disponible" : "Preparación pendiente"}</span>
    </header>

    <div className={styles.notice} role={unavailable ? "alert" : "status"} data-ui-id="portable-vault.notice">
      <Info size={20} aria-hidden="true" />
      <div><strong>{unavailable ? "No se puede autorizar la apertura." : "La protección nueva aún no está activa."}</strong>
        <p>{unavailable ? "No hay acceso alternativo sin conexión. No se ha solicitado ni liberado ninguna llave desde esta pantalla." : "Esta pantalla prepara el acceso. El registro en Ente Auth y la descarga se habilitarán después de integrar y verificar el servicio."}</p>
      </div>
    </div>

    <div className={styles.grid}>
      <article className={styles.primary} data-ui-id="portable-vault.enrollment">
        <div className={styles.cardTop}><span className={styles.icon}><Smartphone size={23} aria-hidden="true" /></span><span className={styles.step}>01 / AUTORIZACIÓN</span></div>
        <h2>Ente Auth, en tu teléfono</h2>
        <p>Registrarás Khora en Ente Auth. Su código temporal será el segundo factor para autorizar cada apertura.</p>
        <div className={styles.requirement}><KeyRound size={18} aria-hidden="true" /><span>También necesitarás iniciar sesión en Khora.</span></div>
        <button type="button" disabled aria-describedby="portable-enroll-reason" data-ui-id="portable-vault.enroll"><Smartphone size={18} aria-hidden="true" />Registrar Ente Auth<ArrowRight size={18} aria-hidden="true" /></button>
        <p id="portable-enroll-reason" className={styles.help}>Pendiente: alta privada, custodia de llaves y recuperación verificadas. No hay un código de registro generado.</p>
      </article>
      <article className={styles.secondary} data-ui-id="portable-vault.download-panel">
        <div className={styles.cardTop}><span className={styles.icon}><FileLock2 size={23} aria-hidden="true" /></span><span className={styles.step}>02 / ARCHIVO LOCAL</span></div>
        <h2>Una copia cifrada, portable</h2>
        <p>El archivo cifrado podrá viajar contigo. Para abrirlo, Khora deberá autorizar la operación en línea; no habrá desbloqueo offline alternativo.</p>
        <div className={styles.requirement}><Laptop size={18} aria-hidden="true" /><span>Descifra solo en un equipo de confianza.</span></div>
        <button type="button" disabled aria-describedby="portable-download-reason" data-ui-id="portable-vault.download"><ArrowDownToLine size={18} aria-hidden="true" />Descargar bóveda</button>
        <p id="portable-download-reason" className={styles.help}>Pendiente: cliente cifrado, destino protegido y restauración probada. Esta pantalla no recibe tus archivos.</p>
      </article>
    </div>

    <section className={styles.flow} aria-labelledby="portable-flow-title" data-ui-id="portable-vault.flow">
      <h2 id="portable-flow-title">Así se abrirá</h2>
      <ol><li><span>1</span>Inicia sesión en Khora</li><li><span>2</span>Confirma con Ente Auth</li><li><span>3</span>Abre la copia en tu equipo</li></ol>
      <p>Flujo previsto · todavía no disponible.</p>
    </section>

    <details className={styles.details} data-ui-id="portable-vault.limits">
      <summary><ShieldAlert size={19} aria-hidden="true" />Qué protege y qué no</summary>
      <div>
        <p>El objetivo es exigir una nueva autorización en cada apertura. Un código temporal no es la llave de cifrado del archivo.</p>
        <p>Un equipo comprometido puede capturar el contenido después de abrirlo. En una computadora de renta o pública, no descargues ni descifres el corpus real.</p>
        <p>Esto no elimina copias ya extraídas ni permite asegurar que nunca hubo acceso no autorizado. La bóveda actual de Khora no cambia con esta pantalla.</p>
      </div>
    </details>
  </section>;
}
