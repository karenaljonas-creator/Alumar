export interface Database {
  public: {
    Tables: {
      machines: {
        Row: {
          id: string
          name: string
          model: string
          area: string
          serial_number: string
          tag: string
          in_contract: boolean
          status: 'operacional' | 'parado' | 'desativado'
          hours_worked: number
          hours_available: number
          next_maintenance: string | null
          last_maintenance: string | null
          maintenance_interval: number
          responsavel: string
          acao_responsavel: string
          categoria: string | null
          categoria_updated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['machines']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['machines']['Insert']>
      }
      weekly_records: {
        Row: {
          id: string
          machine_id: string
          week: string
          hours_worked: number
          hours_available: number
          availability: number
          observations: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['weekly_records']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['weekly_records']['Insert']>
      }
      stops: {
        Row: {
          id: string
          machine_id: string
          start_date: string
          end_date: string | null
          reason: string
          type: 'mecanica' | 'eletrica' | 'operacional' | 'preventiva' | 'corretiva' | 'outros'
          description: string | null
          resolved: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['stops']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['stops']['Insert']>
      }
      settings: {
        Row: {
          id: string
          client_name: string
          contract_number: string
          location: string
          target_availability: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['settings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['settings']['Insert']>
      }
    }
  }
}

// Tipos simplificados para uso no app
export type Machine = Database['public']['Tables']['machines']['Row']
export type WeeklyRecord = Database['public']['Tables']['weekly_records']['Row']
export type Stop = Database['public']['Tables']['stops']['Row']
export type Settings = Database['public']['Tables']['settings']['Row']
