import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Finance AI — Personal Finance Assistant",
  description:
    "An AI-powered personal finance companion. Chat with your finances, track budgets, and get smart insights about your spending.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Toaster
          position="top-right"
          richColors
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--fin-card-2)",
              border: "1px solid var(--fin-border-2)",
              color: "var(--fin-text)",
            },
          }}
        />
      </body>
    </html>
  );
}
