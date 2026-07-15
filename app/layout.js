import "./globals.css";

export const metadata = {
  title: "Pariksha Saathi — CBSE Class 10",
  description: "AI study companion for CBSE Class 10 — doubt solver, mock tests, and revision notes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Lora:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
