import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateApiKey } from '@/lib/services/api-keys'
import { fireWebhookEvent } from '@/lib/services/webhooks'

export async function POST(request: NextRequest) {
  // Authenticate via API key
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
  }

  const apiKey = authHeader.substring(7)
  const validation = await validateApiKey(apiKey)
  if (!validation) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const { company_id } = validation

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required fields
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!body.email || typeof body.email !== 'string' || !body.email.trim()) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: lead, error } = await admin
    .from('leads')
    .insert({
      company_id,
      name: body.name.trim(),
      email: body.email.trim(),
      phone: body.phone?.trim() || null,
      company_name: body.company_name?.trim() || null,
      source: body.source?.trim() || 'website',
      message: body.message?.trim() || null,
      metadata: body.metadata || {},
    })
    .select('id, name, email, status, source, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  // Fire webhook event (non-blocking)
  fireWebhookEvent(company_id, 'lead.created', {
    lead_id: lead.id,
    name: lead.name,
    email: lead.email,
    source: lead.source,
    company_name: body.company_name?.trim() || null,
  }).catch(() => {})

  return NextResponse.json({ data: lead }, { status: 201 })
}

export async function GET(request: NextRequest) {
  // Authenticate via API key
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
  }

  const apiKey = authHeader.substring(7)
  const validation = await validateApiKey(apiKey)
  if (!validation) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const { company_id } = validation
  const admin = createAdminClient()

  const status = request.nextUrl.searchParams.get('status')
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50

  let query = admin
    .from('leads')
    .select('id, name, email, phone, company_name, source, status, message, metadata, converted_at, created_at, updated_at')
    .eq('company_id', company_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}
