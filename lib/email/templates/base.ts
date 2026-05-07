import type { EmailBranding } from '../types'

export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return ''
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface WrapOptions {
  preheader?: string
  heading: string
  intro?: string
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
}

export function wrapTemplate(branding: EmailBranding, opts: WrapOptions): string {
  const primary = branding.primary_color || '#2563eb'
  const secondary = branding.secondary_color || '#1e293b'

  const logoBlock = branding.email_show_logo && branding.logo_url
    ? `<img src="${escapeHtml(branding.logo_url)}" alt="${escapeHtml(branding.name)}" height="40" style="display:block;height:40px;width:auto;border:0;outline:none;text-decoration:none;" />`
    : `<div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">${escapeHtml(branding.name)}</div>`

  const ctaBlock = opts.ctaLabel && opts.ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
        <tr>
          <td style="background-color:${primary};border-radius:6px;">
            <a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;font-family:Helvetica,Arial,sans-serif;">${escapeHtml(opts.ctaLabel)}</a>
          </td>
        </tr>
       </table>`
    : ''

  const introBlock = opts.intro
    ? `<p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6;">${escapeHtml(opts.intro)}</p>`
    : ''

  const signatureBlock = branding.email_signature
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;color:#475569;font-size:13px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(branding.email_signature)}</div>`
    : ''

  const credentialsLine = branding.credentials.length > 0
    ? branding.credentials.map(c => `${escapeHtml(c.label)}: ${escapeHtml(c.value)}`).join(' &middot; ')
    : ''

  const footerLines: string[] = []
  if (branding.address) footerLines.push(escapeHtml(branding.address))
  const contactBits: string[] = []
  if (branding.phone) contactBits.push(escapeHtml(branding.phone))
  if (branding.email) contactBits.push(escapeHtml(branding.email))
  if (branding.website) contactBits.push(escapeHtml(branding.website))
  if (contactBits.length) footerLines.push(contactBits.join(' &middot; '))
  if (branding.abn) footerLines.push(`ABN: ${escapeHtml(branding.abn)}`)
  if (credentialsLine) footerLines.push(credentialsLine)

  const footerHtml = footerLines
    .map(line => `<div style="margin:2px 0;">${line}</div>`)
    .join('')

  const preheaderBlock = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent;visibility:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>`
    : ''

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Helvetica,Arial,sans-serif;">
${preheaderBlock}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:24px 0;">
<tr><td align="center">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <tr>
      <td style="background-color:${primary};padding:20px 28px;">
        ${logoBlock}
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px 24px;">
        <h1 style="margin:0 0 16px;color:${secondary};font-size:20px;font-weight:700;line-height:1.3;">${escapeHtml(opts.heading)}</h1>
        ${introBlock}
        ${opts.bodyHtml}
        ${ctaBlock}
        ${signatureBlock}
      </td>
    </tr>
    <tr>
      <td style="padding:20px 28px;background-color:#f8fafc;color:#64748b;font-size:11px;line-height:1.5;border-top:1px solid #e2e8f0;">
        ${footerHtml}
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}

export function detailsTable(rows: { label: string; value: string }[]): string {
  const trs = rows
    .filter(r => r.value !== undefined && r.value !== null && r.value !== '')
    .map(r => `
      <tr>
        <td style="padding:8px 0;color:#64748b;font-size:13px;width:140px;vertical-align:top;">${escapeHtml(r.label)}</td>
        <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;">${escapeHtml(r.value)}</td>
      </tr>
    `)
    .join('')

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:8px 0 16px;border-collapse:collapse;">
    ${trs}
  </table>`
}

export function plainTextFooter(branding: EmailBranding): string {
  const lines: string[] = []
  if (branding.email_signature) lines.push('', branding.email_signature)
  lines.push('', '---', branding.name)
  if (branding.address) lines.push(branding.address)
  const contactBits: string[] = []
  if (branding.phone) contactBits.push(branding.phone)
  if (branding.email) contactBits.push(branding.email)
  if (branding.website) contactBits.push(branding.website)
  if (contactBits.length) lines.push(contactBits.join(' | '))
  if (branding.abn) lines.push(`ABN: ${branding.abn}`)
  return lines.join('\n')
}
