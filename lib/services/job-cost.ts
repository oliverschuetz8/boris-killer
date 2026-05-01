import { createClient } from '@/lib/supabase/client'

export interface MaterialCostItem {
  id: string
  material_name: string
  quantity: number
  unit: string
  sell_price: number
  buy_cost: number
  total_sell: number
  total_buy: number
}

export interface LabourCostItem {
  id: string
  user_id: string | null
  full_name: string
  trade: string | null
  date: string
  hours: number
  hourly_rate: number
  cost: number
}

export interface JobCostBreakdown {
  materials: MaterialCostItem[]
  labour: LabourCostItem[]
  materialSellTotal: number
  materialBuyTotal: number
  materialMargin: number
  labourTotal: number
  grandTotal: number
  totalMinutes: number
}

export async function getJobCostBreakdown(jobId: string): Promise<JobCostBreakdown> {
  const supabase = createClient()

  // Fetch room_materials for this job, joined with parts and materials for pricing
  const { data: roomMaterials } = await supabase
    .from('room_materials')
    .select(`
      id, quantity, material_name_override,
      material:materials(id, name, unit, unit_price),
      part:parts(id, name, unit, buy_cost, sell_price),
      product:products(id, name, total_buy_cost, total_sell_price)
    `)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  // Fetch time entries for labour (from Xero sync)
  const { data: timeEntries } = await supabase
    .from('job_time_entries')
    .select(`
      id, user_id, employee_name, date, hours, hourly_rate, cost,
      user:users(id, full_name, trade)
    `)
    .eq('job_id', jobId)
    .eq('status', 'assigned')
    .order('date')

  const materialItems: MaterialCostItem[] = (roomMaterials || []).map((rm: any) => {
    const part = Array.isArray(rm.part) ? rm.part[0] : rm.part
    const product = Array.isArray(rm.product) ? rm.product[0] : rm.product
    const material = Array.isArray(rm.material) ? rm.material[0] : rm.material
    const qty = Number(rm.quantity)

    let name = rm.material_name_override || 'Unknown'
    let unit = 'ea'
    let sellPrice = 0
    let buyCost = 0

    if (part) {
      name = part.name
      unit = part.unit || 'ea'
      sellPrice = Number(part.sell_price || 0)
      buyCost = Number(part.buy_cost || 0)
    } else if (product) {
      name = product.name
      unit = 'kit'
      sellPrice = Number(product.total_sell_price || 0)
      buyCost = Number(product.total_buy_cost || 0)
    } else if (material) {
      name = material.name
      unit = material.unit || 'ea'
      sellPrice = Number(material.unit_price || 0)
      buyCost = 0
    }

    return {
      id: rm.id,
      material_name: name,
      quantity: qty,
      unit,
      sell_price: sellPrice,
      buy_cost: buyCost,
      total_sell: qty * sellPrice,
      total_buy: qty * buyCost,
    }
  })

  const labourItems: LabourCostItem[] = (timeEntries || []).map((e: any) => {
    const user = Array.isArray(e.user) ? e.user[0] : e.user
    const hrs = Number(e.hours || 0)
    const rate = Number(e.hourly_rate || 0)
    return {
      id: e.id,
      user_id: e.user_id,
      full_name: user?.full_name || e.employee_name || 'Unknown',
      trade: user?.trade || null,
      date: e.date,
      hours: hrs,
      hourly_rate: rate,
      cost: e.cost != null ? Number(e.cost) : hrs * rate,
    }
  })

  const materialSellTotal = materialItems.reduce((sum, m) => sum + m.total_sell, 0)
  const materialBuyTotal = materialItems.reduce((sum, m) => sum + m.total_buy, 0)
  const materialMargin = materialBuyTotal > 0
    ? Math.round(((materialSellTotal - materialBuyTotal) / materialBuyTotal) * 10000) / 100
    : 0
  const labourTotal = labourItems.reduce((sum, l) => sum + l.cost, 0)
  const totalMinutes = labourItems.reduce((sum, l) => sum + (l.hours * 60), 0)

  return {
    materials: materialItems,
    labour: labourItems,
    materialSellTotal,
    materialBuyTotal,
    materialMargin,
    labourTotal,
    grandTotal: materialSellTotal + labourTotal,
    totalMinutes,
  }
}
