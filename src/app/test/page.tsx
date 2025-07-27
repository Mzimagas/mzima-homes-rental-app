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
        <a href="/" style={{ color: 'blue', textDecoration: 'underline' }}>
          Go back to home page
        </a>
      </div>
      <div style={{ marginTop: '20px' }}>
        <a href="/dashboard" style={{ color: 'blue', textDecoration: 'underline' }}>
          Go to dashboard
        </a>
      </div>
    </div>
  )
}
