import "./styles/globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "g1 Prototype",
  description: "Using Llama-3.1 70b on Groq to create o1-like reasoning chains",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
