'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ProductPart {
  id: string
  product_id: string
  part_id: string
  quantity: number
  part?: {
    id: string
    name: string
    unit: string
    buy_cost: number | null
    sell_price: number | null
  }
}

export interface Product {
  id: string
  company_id: string
  name: string
  description: string | null
  total_buy_cost: number | null
  total_sell_price: number | null
  margin: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  product_parts?: ProductPart[]
}

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_parts (
        id, product_id, part_id, quantity,
        part:parts (id, name, unit, buy_cost, sell_price)
      )
    `)
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error('Failed to fetch products')
  return data || []
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_parts (
        id, product_id, part_id, quantity,
        part:parts (id, name, unit, buy_cost, sell_price)
      )
    `)
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createProduct(formData: {
  name: string
  description?: string
  total_sell_price?: number | null
  margin?: number | null
}): Promise<Product> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')

  const { data, error } = await supabase
    .from('products')
    .insert({
      company_id: profile.company_id,
      name: formData.name,
      description: formData.description || null,
      total_sell_price: formData.total_sell_price ?? null,
      margin: formData.margin ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error('Failed to create product')
  revalidatePath('/settings/products')
  return data
}

export async function updateProduct(id: string, formData: {
  name?: string
  description?: string | null
  total_buy_cost?: number | null
  total_sell_price?: number | null
  margin?: number | null
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update(formData)
    .eq('id', id)
  if (error) throw new Error('Failed to update product')
  revalidatePath('/settings/products')
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw new Error('Failed to delete product')
  revalidatePath('/settings/products')
}

export async function addProductPart(
  productId: string,
  partId: string,
  quantity: number
): Promise<ProductPart> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('product_parts')
    .insert({ product_id: productId, part_id: partId, quantity })
    .select('id, product_id, part_id, quantity')
    .single()
  if (error) throw new Error('Failed to add part to product')

  await recalculateProductTotals(productId)
  revalidatePath('/settings/products')
  return data
}

export async function updateProductPartQuantity(
  id: string,
  productId: string,
  quantity: number
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('product_parts')
    .update({ quantity })
    .eq('id', id)
  if (error) throw new Error('Failed to update part quantity')

  await recalculateProductTotals(productId)
  revalidatePath('/settings/products')
}

export async function removeProductPart(id: string, productId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('product_parts')
    .delete()
    .eq('id', id)
  if (error) throw new Error('Failed to remove part from product')

  await recalculateProductTotals(productId)
  revalidatePath('/settings/products')
}

export async function recalculateProductTotals(productId: string): Promise<void> {
  const supabase = await createClient()

  const { data: parts } = await supabase
    .from('product_parts')
    .select('quantity, part:parts(buy_cost, sell_price)')
    .eq('product_id', productId)

  if (!parts || parts.length === 0) {
    await supabase
      .from('products')
      .update({ total_buy_cost: null, total_sell_price: null, margin: null })
      .eq('id', productId)
    return
  }

  let totalBuy = 0
  let totalSell = 0
  let hasBuy = false
  let hasSell = false

  for (const pp of parts) {
    const part = Array.isArray(pp.part) ? pp.part[0] : pp.part
    if (!part) continue
    const qty = Number(pp.quantity)
    if (part.buy_cost != null) {
      totalBuy += qty * Number(part.buy_cost)
      hasBuy = true
    }
    if (part.sell_price != null) {
      totalSell += qty * Number(part.sell_price)
      hasSell = true
    }
  }

  const margin = hasBuy && hasSell && totalBuy > 0
    ? Math.round(((totalSell - totalBuy) / totalBuy) * 10000) / 100
    : null

  // Check if product has a manual override for sell price
  const { data: product } = await supabase
    .from('products')
    .select('total_sell_price')
    .eq('id', productId)
    .single()

  await supabase
    .from('products')
    .update({
      total_buy_cost: hasBuy ? Math.round(totalBuy * 100) / 100 : null,
      total_sell_price: hasSell ? Math.round(totalSell * 100) / 100 : null,
      margin,
    })
    .eq('id', productId)
}
