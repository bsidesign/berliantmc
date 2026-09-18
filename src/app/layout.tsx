import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Berlian Toastmasters",
  description: "Meeting toolkit for Berlian Toastmasters Club",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Stand-in for Clash Grotesk (see globals.css) — loaded at runtime,
            no build-time network dependency. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-brand-dark-1">
        {children}
      </body>
    </html>
  );
}
