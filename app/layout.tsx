import type React from "react"
import type { Metadata } from "next"
import { Poppins, Inter, Montserrat } from "next/font/google"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
})

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-montserrat",
  display: "swap",
})

export const metadata: Metadata = {
  title: "AI Prescription Guardian - Neon",
  description: "AI-Driven Prescription Safety Analysis",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable} ${montserrat.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
