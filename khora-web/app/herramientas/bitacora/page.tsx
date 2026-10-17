import { redirect } from "next/navigation";

// Compatibilidad histórica: la antigua Bitácora fue absorbida por la
// superficie canónica de Volcados durante la migración a Shell v2.
export default function BitacoraRedirect() {
  redirect("/sistema/custodia");
}
