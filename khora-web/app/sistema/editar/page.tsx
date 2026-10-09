import VolcadosPage from "../volcados/page";

export default function EditarPage() {
  // Mantener la ruta histórica viva y directa hasta superar ING-DIRECT-01 en producción.
  // Comparte el flujo de Volcados; no es una ruta de Ingreso ni una redirección.
  return <VolcadosPage legacyEditorEntry />;
}
