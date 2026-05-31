import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role === "ADMIN") redirect("/admin/dashboard");
  redirect("/dashboard");
}
