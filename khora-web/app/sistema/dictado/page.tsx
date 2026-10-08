import { redirect } from "next/navigation";

export default function DictadoPage() {
  redirect("/sistema/ingreso?modo=dictado");
}
