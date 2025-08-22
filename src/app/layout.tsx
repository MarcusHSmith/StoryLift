import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Navigation } from '@/components/ui/navigation';
import { Github } from 'lucide-react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'StoryLift - Transform videos into Instagram Stories',
  description:
    'Create beautiful Instagram Stories from your videos with professional editing tools',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">StoryLift</h1>
              </div>
              <Navigation />
              <nav className="flex items-center gap-4">
                <ThemeToggle />
                <a
                  href="https://github.com/MarcusHSmith/StoryLift"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </nav>
            </div>
          </header>
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
