import { createClient } from '@/lib/supabase/client'

export interface MaterialCostItem {
  id: string
  material_name: string
  quantity: number
  unit: string
  unit_price: number
  total_cost: number
}

export interface LabourCostItem {
  id: string
  user_id: string
  full_name: string
  trade: string | null
  started_at: string
  completed_at: string | null
  duration_minutes: number | null
  hourly_rate: number
  cost: number
}

export interface JobCostBreakdown {
  materials: MaterialCostItem[]
  labour: LabourCostItem[]
  materialTotal: number
  labourTotal: number
  grandTotal: number
  totalMinutes: number
}

export async function getJobCostBreakdown(jobId: string): Promise<JobCostBreakdown> {
  const supabase = createClient()

  const [{ data: materials }, { data: timeEntries }] = await Promise.all([
    supabase
      .from('job_materials')
      .select('id, material_name, quantity, unit, unit_price, total_cost')
      .eq('job_id', jobId)
      .order('logged_at', { ascending: false }),
    supabase
      .from('job_time_entries')
      .select(`
        id, user_id, started_at, completed_at, duration_minutes, hourly_rate,
        user:users(id, full_name, trade)
      `)
      .eq('job_id', jobId)
      .order('started_at'),
  ])

  const materialItems: MaterialCostItem[] = (materials || []).map(m => ({
    id: m.id,
    material_name: m.material_name,
    quantity: Number(m.quantity),
    unit: m.unit || 'ea',
    unit_price: Number(m.unit_price),
    total_cost: Number(m.total_cost || 0),
  }))

  const labourItems: LabourCostItem[] = (timeEntries || []).map((e: any) => {
    const user = Array.isArray(e.user) ? e.user[0] : e.user
    const mins = e.duration_minutes || 0
    return {
      id: e.id,
      user_id: e.user_id,
      full_name: user?.full_name || 'Unknown',
      trade: user?.trade || null,
      started_at: e.started_at,
      completed_at: e.completed_at,
      duration_minutes: e.duration_minutes,
      hourly_rate: Number(e.hourly_rate || 0),
      cost: (mins / 60) * Number(e.hourly_rate || 0),
    }
  })

  const materialTotal = materialItems.reduce((sum, m) => sum + m.total_cost, 0)
  const labourTotal = labourItems.reduce((sum, l) => sum + l.cost, 0)
  const totalMinutes = labourItems.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)

  return {
    materials: materialItems,
    labour: labourItems,
    materialTotal,
    labourTotal,
    grandTotal: materialTotal + labourTotal,
    totalMinutes,
  }
}
