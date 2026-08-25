"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth-redirect";
import { claimCurrentAnonymousSession } from "@/lib/server/auth";
import { getSupabaseAuth } from "@/lib/server/supabase-auth";
import { getSiteUrl } from "@/lib/site";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

function authErrorPath(mode: "sign-in" | "sign-up", next: string, message: string) {
  const query = new URLSearchParams({ mode, next, error: message });
  return `/auth?${query.toString()}`;
}

function credentials(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export async function signIn(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const parsed = credentials(formData);
  if (!parsed.success) {
    redirect(authErrorPath("sign-in", next, "Enter a valid email and a password of at least 8 characters."));
  }
  const supabase = await getSupabaseAuth();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(authErrorPath("sign-in", next, "The email or password was not accepted."));
  await claimCurrentAnonymousSession();
  redirect(next);
}

export async function signUp(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const parsed = credentials(formData);
  if (!parsed.success) {
    redirect(authErrorPath("sign-up", next, "Enter a valid email and a password of at least 8 characters."));
  }
  const callback = new URL("/auth/callback", getSiteUrl());
  callback.searchParams.set("next", next);
  const supabase = await getSupabaseAuth();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: callback.toString() },
  });
  if (error) redirect(authErrorPath("sign-up", next, "This account could not be created. Please retry."));
  if (data.session) {
    await claimCurrentAnonymousSession();
    redirect(next);
  }
  const query = new URLSearchParams({ mode: "sign-in", next, message: "Check your email to confirm your account." });
  redirect(`/auth?${query.toString()}`);
}

export async function signOut() {
  const supabase = await getSupabaseAuth();
  await supabase.auth.signOut();
  redirect("/");
}
