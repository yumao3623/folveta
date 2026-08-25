import Link from "next/link";

export default function SessionNotFound() {
  return <main className="mx-auto max-w-xl px-5 py-24 text-center">
    <h1 className="text-3xl font-semibold text-stone-950">This study session is unavailable.</h1>
    <p className="mt-4 leading-7 text-stone-600">It may have expired, or this browser does not hold its private access token.</p>
    <Link href="/" className="mt-7 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white">Start a new guide</Link>
  </main>;
}
