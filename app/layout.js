import '../styles/global.css'

export const metadata = {
  title: 'Survive the Night',
  description: 'A voice-controlled horror survival game',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-green-300 font-mono">
        {children}
      </body>
    </html>
  )
}