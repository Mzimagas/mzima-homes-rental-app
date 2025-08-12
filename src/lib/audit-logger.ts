export async function audit(event: string, identifier?: string) {
  try {
    await fetch('/api/security/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, identifier }) })
  } catch {}
}

