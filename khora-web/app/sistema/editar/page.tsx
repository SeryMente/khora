import { redirect } from "next/navigation";

export default function EditarPage() {
  redirect("/sistema/ingreso?modo=revision");
}
