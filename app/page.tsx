import Script from "next/script";

import { LandingPage } from "@/components/landing/landing-page";

export default function HomePage() {
  return (
    <>
      <Script
        src="https://app.lemonsqueezy.com/js/lemon.js"
        strategy="afterInteractive"
      />
      <LandingPage />
    </>
  );
}
