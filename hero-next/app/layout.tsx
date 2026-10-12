import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rose — Your website should talk | Wildrose Automations",
  description: "Meet Rose, the AI voice and chat front desk for small-business websites.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
