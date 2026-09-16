"use client";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { CartoonIcon } from "@/components/ui/cartoon-icon";

export default function PageError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:py-12">
      <BrandMark />
      <section className="py-14 text-center" role="alert">
        <CartoonIcon name="error" size={96} animated />
        <h1 className="mt-6 text-3xl font-extrabold">This page could not load.</h1>
        <Button onClick={retry} size="lg" className="mt-7">Try again</Button>
      </section>
    </main>
  );
}
