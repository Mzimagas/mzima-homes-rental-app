import Link from 'next/link'

export default function TestPage() {
  return (
    <div style={{
      backgroundColor: 'white',
      color: 'black',
      padding: '20px',
      minHeight: '100vh',
      fontSize: '24px'
    }}>
      <h1>Test Page - Server is Working!</h1>
      <p>If you can see this, the Next.js server is running correctly.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
      <div style={{ marginTop: '20px' }}>
        <Link href="/" style={{ color: 'blue', textDecoration: 'underline' }}>
          Go back to home page
        </Link>
      </div>
      <div style={{ marginTop: '20px' }}>
        <Link href="/dashboard" style={{ color: 'blue', textDecoration: 'underline' }}>
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
