import { redirect } from "next/navigation";

/** Historical links keep their exact record/version selection. */
export default async function LegacyVolcadosPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  redirect("/sistema/custodia" + (query.size ? "?" + query.toString() : ""));
}
