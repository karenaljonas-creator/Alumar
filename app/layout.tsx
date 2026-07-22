<<<<<<< HEAD
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
=======
import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { cookies } from "next/headers"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/auth-provider"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth"
import "./globals.css"
>>>>>>> origin/main

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
<<<<<<< HEAD
  title: 'ALUMAR - Gestão de Máquinas',
  description: 'Sistema de Gestão de Máquinas Pesadas - ALUMAR',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
=======
  title: "Painel de Controle Salobo | Gestão de Máquinas",
  description: "Painel operacional Atlas Copco para gestão de disponibilidade e paradas de máquinas.",
  generator: "v0.app",
>>>>>>> origin/main
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const role = await verifySessionToken(token, process.env.AUTH_SECRET || "")

  return (
    <html lang="pt-BR" className="bg-background">
<<<<<<< HEAD
      <body className="font-sans antialiased">{children}</body>
=======
      <body className={`font-sans antialiased`}>
        <AuthProvider role={role}>{children}</AuthProvider>
        <Toaster />
        {/* Analytics component removed */}
      </body>
>>>>>>> origin/main
    </html>
  )
}
