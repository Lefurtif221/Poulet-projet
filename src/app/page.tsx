import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? homeFor(user.role) : "/connexion");
}
