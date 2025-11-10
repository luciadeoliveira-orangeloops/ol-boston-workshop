import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"
import { Header } from "@/components/Header"
import { LangGraphVoiceAgent } from "@/components/LangGraphVoiceAgent"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RetailCo - Modern Retail Catalog",
  description: "Browse our collection of hoodies, shirts, jeans, jackets, and pants",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Suspense fallback={<div className="h-16 border-b" />}>
          <Header />
        </Suspense>
        {children}
        <div className="fixed bottom-4 right-4 z-50">
          <LangGraphVoiceAgent />
        </div>
      </body>
    </html>
  )
}
