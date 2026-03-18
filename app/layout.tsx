import type { Metadata } from "next";
import { Fredoka, Noto_Serif_TC, Nunito } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const toneSerif = Noto_Serif_TC({
  variable: "--font-tone-serif",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  title: "注音派對",
  description: "即時連線注音猜字派對遊戲",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${fredoka.variable} ${nunito.variable} ${toneSerif.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
