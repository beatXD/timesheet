import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";
import clientPromise from "./mongodb-client";
import { connectDB } from "./db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/types";

declare module "next-auth" {
  interface User {
    role?: UserRole;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: UserRole;
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt", // Use JWT for Credentials provider
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true, // Allow linking accounts with same email
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true, // Allow linking accounts with same email
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("กรุณากรอก Email และ Password");
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email });

        if (!user || !user.password) {
          throw new Error("ไม่พบบัญชีผู้ใช้นี้ หรือบัญชีนี้ใช้ OAuth เท่านั้น");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // For OAuth providers, check if account is already linked to another user
      if (account && account.provider !== "credentials") {
        const client = await clientPromise;
        const db = client.db();

        // Check if this OAuth account already exists
        const existingAccount = await db.collection("accounts").findOne({
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        });

        if (existingAccount) {
          // Account exists - check if there's a logged-in user trying to link
          const cookieStore = await cookies();
          const sessionToken = cookieStore.get("authjs.session-token")?.value
            || cookieStore.get("__Secure-authjs.session-token")?.value;

          if (sessionToken) {
            // User is logged in - this is an account linking attempt
            try {
              const decoded = await decode({
                token: sessionToken,
                secret: process.env.AUTH_SECRET!,
                salt: "authjs.session-token",
              });

              if (decoded?.id && decoded.id !== existingAccount.userId.toString()) {
                // This OAuth account is linked to a different user
                return `/profile?error=OAuthAccountAlreadyLinked&provider=${account.provider}`;
              }
            } catch {
              // Failed to decode token - allow flow to continue
            }
          }
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role || "user";
      }

      // For OAuth, fetch user from DB to get latest role
      if (account && account.provider !== "credentials") {
        await connectDB();
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) || "user";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
