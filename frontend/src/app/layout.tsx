import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Toaster } from 'react-hot-toast';
import AuthModal from "@/components/ui/AuthModal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EcomStore - Modern Ecommerce Platform",
  description: "Discover a wide range of products at EcomStore. Built with Next.js, TypeScript, and Tailwind CSS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // NOTE: This will cause an error on every page load
  // throw new Error("Test error for global-error page"); // Use this for testing Global Fallback UI Component Rendering
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} flex flex-col min-h-screen bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
          <AuthModal />
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
