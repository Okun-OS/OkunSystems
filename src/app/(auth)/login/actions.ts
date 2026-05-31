"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(email: string, password: string): Promise<string | null> {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return null;
  } catch (error: unknown) {
    const digest = (error as { digest?: string })?.digest;
    if (digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    if (error instanceof AuthError) {
      return "Ungültige E-Mail-Adresse oder falsches Passwort.";
    }
    console.error("[login] error:", error);
    return "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.";
  }
}
