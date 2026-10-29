import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";

const secret =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "okun-systems-platform-secret-please-set-NEXTAUTH_SECRET-in-railway";

export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const { db } = await import("@/lib/db");

          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
            include: { company: true },
          });

          if (!user) {
            return null;
          }

          // Deaktivierte Konten dürfen sich nicht anmelden — unabhängig davon,
          // ob das Passwort noch stimmt.
          if (user.deactivatedAt) {
            return null;
          }

          const isValid = await bcryptjs.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) {
            return null;
          }

          /*
            Nach der ersten erfolgreichen Anmeldung ist der Zugang eingerichtet.

            `firstLogin` wurde bisher gesetzt und nie gelöscht — das Feld hieß
            also „erster Login" und bedeutete „irgendwann einmal angelegt".
            Davon hängt zweierlei ab: der Hinweis „Einrichtung offen" in der
            Benutzerliste und der erste Schritt der Onboarding-Checkliste.
            Beide standen dauerhaft offen.

            Der Schreibvorgang läuft bewusst ohne `await`: Die Anmeldung soll
            nicht auf ihn warten, und misslingt er, ist beim nächsten Login
            wieder Gelegenheit dazu.
          */
          if (user.firstLogin) {
            void db.user
              .update({ where: { id: user.id }, data: { firstLogin: false } })
              .catch(() => {});
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            canStrategy: user.canStrategy,
            companyId: user.companyId,
            firstLogin: false,
          };
        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.canStrategy = (user as any).canStrategy;
        token.companyId = (user as any).companyId;
        token.firstLogin = (user as any).firstLogin;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).canStrategy = token.canStrategy;
        (session.user as any).companyId = token.companyId;
        (session.user as any).firstLogin = token.firstLogin;
      }
      return session;
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret,
  trustHost: true,
});
