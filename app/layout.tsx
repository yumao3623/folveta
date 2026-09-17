import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { isPrelaunch, getSiteUrl, SITE_NAME } from "@/lib/site";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Turn course PDFs, Word, Excel, PowerPoint, and image materials into a clear, source-grounded study guide with priorities and an optional Quick Check.",
  applicationName: SITE_NAME,
  category: "education",
  // Positive directives belong to approved pages, not the root 404 boundary.
  robots: isPrelaunch() ? { index: false, follow: false } : undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
