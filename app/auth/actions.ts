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

function forgotPasswordPath(message: string) {
  return `/auth/forgot-password?${new URLSearchParams({ error: message }).toString()}`;
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

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email");
  if (typeof email !== "string" || !z.email().safeParse(email).success) {
    redirect(forgotPasswordPath("Enter a valid email address."));
  }

  const callback = new URL("/auth/callback", getSiteUrl());
  callback.searchParams.set("next", "/auth/reset-password");
  const supabase = await getSupabaseAuth();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callback.toString(),
  });

  if (error) {
    redirect(forgotPasswordPath("We could not process that request. Please try again."));
  }

  redirect("/auth/forgot-password?message=If an account exists for that email, we sent a password reset link.");
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  if (typeof password !== "string" || typeof confirmPassword !== "string" || password.length < 8 || password.length > 128) {
    redirect("/auth/reset-password?error=Choose a password between 8 and 128 characters.");
  }
  if (password !== confirmPassword) {
    redirect("/auth/reset-password?error=The passwords do not match.");
  }

  const supabase = await getSupabaseAuth();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth?error=This password reset link is invalid or expired.");
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect("/auth/reset-password?error=The password could not be updated. Please request a new reset link.");
  }
  await supabase.auth.signOut();
  redirect("/auth?message=Your password has been updated. Sign in with your new password.");
}

export async function signOut() {
  const supabase = await getSupabaseAuth();
  await supabase.auth.signOut();
  redirect("/");
}
