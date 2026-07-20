/**
 * Error message translation helpers.
 *
 * Raw SDK / Postgres / network errors are written for developers, not tradies.
 * Every user-facing error must answer: WHAT failed + WHY + HOW to fix it.
 * See CLAUDE_REFERENCE/recurring-failures.md #21.
 */

const NETWORK_PATTERNS = [
  /fetch failed/i,
  /failed to fetch/i,
  /networkerror/i,
  /enotfound/i,
  /econnrefused/i,
  /etimedout/i,
  /unexpected token .* in json/i,
  /unexpected end of json/i,
  /load failed/i,
]

const NETWORK_FALLBACK =
  "We couldn't reach our servers. Check your internet — if it keeps happening, our system may be down. Try again in a minute."

function isNetworkError(message: string): boolean {
  return NETWORK_PATTERNS.some(p => p.test(message))
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message: unknown }).message
    if (typeof m === 'string') return m
  }
  return ''
}

/**
 * Translates Supabase auth SDK errors into plain English.
 * Use in: login, signup, password reset, accept-invite, updateUser.
 */
export function friendlyAuthError(err: unknown, fallback?: string): string {
  const message = extractMessage(err)

  if (isNetworkError(message)) return NETWORK_FALLBACK

  if (/invalid login credentials/i.test(message))
    return "That email and password don't match. Double-check both — or use 'Forgot password?' if you can't remember."

  if (/email not confirmed/i.test(message))
    return "You haven't confirmed your email yet. Check your inbox for the confirmation link we sent when you signed up."

  if (/already registered|already.+exist|user already/i.test(message))
    return 'An account with this email already exists. Try signing in instead, or use a different email.'

  if (/unable to validate email|invalid.+email|email.+invalid/i.test(message))
    return "That email address doesn't look right — double-check for typos."

  if (/password.+(short|6 characters|8 characters|weak)|weak.password/i.test(message))
    return 'Your password is too short or too weak. Use at least 8 characters and mix in some numbers or symbols.'

  if (/same.password|new.password.+(same|different)/i.test(message))
    return "Your new password is the same as your old one. Pick something different."

  if (/email rate limit|rate limit|too many requests/i.test(message))
    return 'Too many attempts. Wait a minute, then try again.'

  if (/signup.+(disabled|not allowed)/i.test(message))
    return "New sign-ups aren't open right now. Contact support if you need access."

  if (/token.+(expired|invalid)|jwt expired|invalid.+token/i.test(message))
    return 'Your session has expired. Refresh the page and sign in again.'

  if (/captcha/i.test(message))
    return "We couldn't verify you aren't a robot. Refresh the page and try again."

  return fallback ?? "Something went wrong. Refresh the page and try again — if it keeps happening, contact support."
}

/**
 * Translates Postgres / Supabase DB errors into plain English.
 * Use in: any catch block around insert/update/delete/select that surfaces to UI.
 */
export function friendlyDbError(err: unknown, fallback?: string): string {
  const message = extractMessage(err)

  if (isNetworkError(message)) return NETWORK_FALLBACK

  if (/jwt expired|token.+(expired|invalid)/i.test(message))
    return 'Your session has expired. Refresh the page and sign in again.'

  if (/row-level security|permission denied|not authorized|insufficient.+permission/i.test(message))
    return "You don't have permission to do that. Ask your account admin if you need access."

  if (/duplicate key|already exists|unique constraint/i.test(message))
    return 'That already exists. Pick a different name or value, then try again.'

  if (/foreign key|violates.+constraint|still referenced/i.test(message))
    return "This item is linked to other records and can't be removed until those are cleared first."

  if (/not.null|null value.+column|missing.+required/i.test(message))
    return 'A required field is missing. Check the form and fill in everything marked required.'

  if (/value too long|exceeds maximum/i.test(message))
    return "One of the fields is too long. Shorten it and try again."

  if (/invalid input syntax|invalid.+format/i.test(message))
    return "One of the values doesn't look right. Check the form for typos and try again."

  return fallback ?? "Something went wrong. Refresh the page and try again — if it keeps happening, contact support."
}

/**
 * Generic friendly-error wrapper. If the caller has a specific fallback (preferred),
 * pass it in — it's what the user sees when no pattern matches.
 *
 * Use this in UI catch blocks where you want one line instead of two:
 *   catch (err) { alert(friendlyError(err, "We couldn't save the customer. Try again or refresh the page.")) }
 */
export function friendlyError(err: unknown, fallback: string): string {
  const message = extractMessage(err)
  if (isNetworkError(message)) return NETWORK_FALLBACK
  if (/jwt expired|token.+(expired|invalid)/i.test(message))
    return 'Your session has expired. Refresh the page and sign in again.'
  if (/row-level security|permission denied|not authorized/i.test(message))
    return "You don't have permission to do that. Ask your account admin if you need access."
  // If the caught error already looks like a translated message (server actions
  // we control throw friendly text), surface it directly.
  if (message && !looksLikeRawError(message)) return message
  return fallback
}

const RAW_ERROR_HINTS = [
  /^postgresql/i,
  /^pgrst/i,
  /^auth.*error/i,
  /\bcolumn\b.+\bdoes not exist\b/i,
  /\brelation\b.+\bdoes not exist\b/i,
  /\bsyntax error\b/i,
  /\bunhandled\b/i,
  /\btypeerror\b/i,
  /\breferenceerror\b/i,
  /\bnetworkerror\b/i,
  /^error\s*:/i,
  /\sat\s.+\.(ts|js):\d+/i,
]

function looksLikeRawError(message: string): boolean {
  if (RAW_ERROR_HINTS.some(p => p.test(message))) return true
  // Anything containing a stack-trace style "at functionName (...)" smells raw.
  if (/\sat\s\w+\s\(/i.test(message)) return true
  return false
}
