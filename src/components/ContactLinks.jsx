import { useState } from 'react'

const email = 'winniehung90306@gmail.com'

export default function ContactLinks() {
  const [copied, setCopied] = useState(false)

  async function copyEmail(event) {
    event.preventDefault()
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      window.location.href = `mailto:${email}`
    }
  }

  return <div className="contact-links" aria-label="Contact Winnie">
    <a href={`mailto:${email}`} onClick={copyEmail}>email</a>
    <span aria-hidden="true">·</span>
    <a href="https://www.linkedin.com/in/winnie-hung-yu-wen/" target="_blank" rel="noopener noreferrer">linkedin</a>
    <span className="contact-feedback" role="status" aria-live="polite">{copied ? 'Email copied!' : ''}</span>
  </div>
}
