import '../styles/global.css'
import ErrorBoundary from './components/ErrorBoundary'

export const metadata = {
  title: 'Survive the Night - Voice-Controlled Horror Game',
  description: 'The world\'s first voice-controlled horror survival game. Use only your voice to survive until sunrise.',
  keywords: 'voice control, horror game, survival, accessibility, hackathon, Next.js, React',
  authors: [{ name: 'Hackathon Team' }],
  openGraph: {
    title: 'Survive the Night - Voice-Controlled Horror Game',
    description: 'The world\'s first voice-controlled horror survival game',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-green-300 font-mono">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}