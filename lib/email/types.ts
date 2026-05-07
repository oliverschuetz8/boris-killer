export type EmailEvent =
  | 'job.created'
  | 'job.completed'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'invoice.overdue'

export const EMAIL_EVENTS: { event: EmailEvent; label: string; description: string; recipientHint: string }[] = [
  {
    event: 'job.created',
    label: 'Job Created',
    description: 'Sent when a new job is added to the system.',
    recipientHint: 'Admins & managers',
  },
  {
    event: 'job.completed',
    label: 'Job Completed',
    description: 'Sent when a job is marked as completed.',
    recipientHint: 'Admins & managers',
  },
  {
    event: 'invoice.sent',
    label: 'Invoice Sent',
    description: 'Sent to the customer when an invoice is marked as sent.',
    recipientHint: 'Customer',
  },
  {
    event: 'invoice.paid',
    label: 'Invoice Paid',
    description: 'Sent when an invoice is marked as paid.',
    recipientHint: 'Admins & managers',
  },
  {
    event: 'invoice.overdue',
    label: 'Invoice Overdue',
    description: 'Sent daily when an invoice passes its due date.',
    recipientHint: 'Admins & managers (+ optional customer chase)',
  },
]

export interface EmailBranding {
  company_id: string
  name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  email_signature: string | null
  email_reply_to: string | null
  email_show_logo: boolean
  abn: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  credentials: { label: string; value: string }[]
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export interface EmailPreference {
  id: string
  company_id: string
  event: EmailEvent
  is_enabled: boolean
  recipient_roles: string[]
  extra_emails: string[]
  notify_customer: boolean
  created_at: string
  updated_at: string
}

export interface EmailLog {
  id: string
  company_id: string
  event: string
  recipient_email: string
  subject: string
  success: boolean
  error_message: string | null
  provider_message_id: string | null
  created_at: string
}
