export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          company_id: string
          customer_id: string
          site_id: string | null
          quote_id: string | null
          job_number: string
          title: string
          description: string | null
          scheduled_start: string | null
          scheduled_end: string | null
          actual_start: string | null
          actual_end: string | null
          status: string
          priority: string | null
          started_at: string | null
          completed_at: string | null
          completed_by: string | null
          job_settings: Record<string, any> | null
          customer_approval: boolean | null
          customer_signature_url: string | null
          customer_signed_at: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          notes: string | null
          internal_notes: string | null
          site_name: string | null
          site_address_line1: string | null
          site_city: string | null
          site_state: string | null
          site_postcode: string | null
          site_manager: string | null
          site_manager_phone: string | null
          job_type: string | null
          evidence_category_id: string | null
          evidence_subcategory_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>
      }
      customers: {
        Row: {
          id: string
          company_id: string
          name: string
          email: string | null          
          phone: string | null
        }
      }
      customer_sites: {
        Row: {
          id: string
          customer_id: string
          site_name: string | null
          address_line1: string
          city: string | null
          postcode: string | null
        }
      }
      users: {
        Row: {
          id: string
          company_id: string
          full_name: string
          role: string
        }
      }
      job_assignments: {
        Row: {
          id: string
          job_id: string
          user_id: string
          role: string | null
        }
      }
    }
  }
}

export type Job = Database['public']['Tables']['jobs']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerSite = Database['public']['Tables']['customer_sites']['Row']
export type User = Database['public']['Tables']['users']['Row']

export type JobWithRelations = Job & {
  customer: Customer | null
  site: CustomerSite | null
  assignments: Array<{
    id: string
    user: User
    role: string | null
  }>
}