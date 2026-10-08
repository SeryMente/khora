import { redirect } from "next/navigation";

export default function IngestaPage() {
  redirect("/sistema/ingreso?modo=ingesta");
}
