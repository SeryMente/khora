// @l0 L0-002-R · @req SISTEMA-MENU/E1
import { redirect } from "next/navigation";

export default function BovedaRedirectPage() {
  redirect("/sistema/seguridad?tab=boveda");
}
