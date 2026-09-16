import type { Metadata } from "next";
import { PublicPageLayout } from "@/components/public-page-layout";
import { buttonClassName } from "@/components/ui/styles";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Folveta support for help with Study Guides, subscriptions, or privacy requests.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PublicPageLayout
      label="Contact"
      title="Support for Folveta"
      description="For product help, subscription questions, refund requests, or privacy requests, email our support team."
      asset="heart"
      actions={<a className={buttonClassName({ size: "lg" })} href="mailto:yumao3623@gmail.com">yumao3623@gmail.com</a>}
    >
      <div className="public-page__section max-w-[760px] rounded-[28px] bg-[var(--source-blue)] p-6 sm:p-8">
        <p className="text-base leading-8 text-[var(--text-secondary)]">Please include the email associated with your Folveta account or subscription when relevant. Do not send sensitive course material or payment-card details by email.</p>
      </div>
    </PublicPageLayout>
  );
}
