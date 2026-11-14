import { redirect } from "next/navigation";
import { IngresoWorkspace } from "../../components/ingreso/IngresoWorkspace";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function IngresoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const mode = Array.isArray(params.modo) ? params.modo[0] : params.modo;

  if (mode === "archivo") {
    const query = new URLSearchParams({ vista: "archivo" });
    for (const key of ["volcado_id", "version"] as const) {
      const value = Array.isArray(params[key]) ? params[key]?.[0] : params[key];
      if (typeof value === "string" && value.trim()) query.set(key, value);
    }
    redirect(`/sistema/custodia?${query.toString()}`);
  }

  return <IngresoWorkspace />;
}
