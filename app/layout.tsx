import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Painel de Controle Salobo | Gestão de Máquinas",
  description: "Painel operacional Atlas Copco para gestão de disponibilidade e paradas de máquinas.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className={`font-sans antialiased`}>
        {children}
        <Toaster />
        {/* Analytics component removed */}
      </body>
    </html>
  )
}
