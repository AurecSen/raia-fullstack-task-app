export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          is_complete: boolean
          notes: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          is_complete?: boolean
          notes?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          is_complete?: boolean
          notes?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type PublicSchema = Database['public']

export type Tables<TableName extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][TableName]['Row']

export type TablesInsert<TableName extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][TableName]['Insert']

export type TablesUpdate<TableName extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][TableName]['Update']

export type Enums<EnumName extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][EnumName]

export const Constants = {
  public: {
    Enums: {},
  },
} as const
