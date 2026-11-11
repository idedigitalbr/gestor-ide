import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/lib/themes/theme-context";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "IDE Gestor — Plataforma de Gestão Empresarial",
  description:
    "Plataforma moderna de gestão de projetos, tarefas, clientes, CRM e financeiro integrada ao ecossistema IDE Digital.",
};

const antiFlashScript = `
(function() {
  try {
    var mode = localStorage.getItem('planw_appearance_mode') || 'dark';
    var isDark = mode !== 'light';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
      </head>
      <body
        className="h-full bg-background text-foreground antialiased select-none"
        suppressHydrationWarning
      >
        <ThemeProvider><AppShell>{children}</AppShell></ThemeProvider>
      </body>
    </html>
  );
}

