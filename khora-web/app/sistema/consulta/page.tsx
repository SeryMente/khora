import { redirect } from "next/navigation";

/** Retired product surface. Keep the historical URL as a compatibility alias. */
export default function ConsultaLegacyPage(): never {
  redirect("/chat");
}
