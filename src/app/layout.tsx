import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/public-sans";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "School dashboard", template: "%s | School dashboard" },
  description: "Student onboarding, enrollment and QR credentials for your school.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
