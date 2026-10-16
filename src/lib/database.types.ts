export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          org_id: string
          session_id: string
          status: string
          student_id: string
        }
        Insert: {
          org_id: string
          session_id: string
          status: string
          student_id: string
        }
        Update: {
          org_id?: string
          session_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_org_id_fkey"
            columns: ["session_id", "org_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "attendance_student_id_org_id_fkey"
            columns: ["student_id", "org_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          content: string
          created_at: string
          id: string
          matched_payment_id: string | null
          org_id: string
          provider: string
          raw: Json | null
          txn_id: string
        }
        Insert: {
          amount: number
          content?: string
          created_at?: string
          id?: string
          matched_payment_id?: string | null
          org_id: string
          provider: string
          raw?: Json | null
          txn_id: string
        }
        Update: {
          amount?: number
          content?: string
          created_at?: string
          id?: string
          matched_payment_id?: string | null
          org_id?: string
          provider?: string
          raw?: Json | null
          txn_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_matched_payment_id_org_id_fkey"
            columns: ["matched_payment_id", "org_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "bank_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          days: number[]
          fee: number
          id: string
          name: string
          org_id: string
          room: string
          subject_id: string | null
          teacher_id: string | null
          time_end: string
          time_start: string
        }
        Insert: {
          days?: number[]
          fee?: number
          id?: string
          name: string
          org_id: string
          room?: string
          subject_id?: string | null
          teacher_id?: string | null
          time_end?: string
          time_start?: string
        }
        Update: {
          days?: number[]
          fee?: number
          id?: string
          name?: string
          org_id?: string
          room?: string
          subject_id?: string | null
          teacher_id?: string | null
          time_end?: string
          time_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_subject_id_org_id_fkey"
            columns: ["subject_id", "org_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "classes_teacher_id_org_id_fkey"
            columns: ["teacher_id", "org_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string
          end_date: string | null
          id: string
          org_id: string
          start_date: string
          student_id: string
        }
        Insert: {
          class_id: string
          end_date?: string | null
          id?: string
          org_id: string
          start_date?: string
          student_id: string
        }
        Update: {
          class_id?: string
          end_date?: string | null
          id?: string
          org_id?: string
          start_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_org_id_fkey"
            columns: ["class_id", "org_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "enrollments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_org_id_fkey"
            columns: ["student_id", "org_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      events: {
        Row: {
          class_id: string
          date: string
          id: string
          note: string
          org_id: string
          time_start: string | null
          type: string
        }
        Insert: {
          class_id: string
          date: string
          id?: string
          note?: string
          org_id: string
          time_start?: string | null
          type: string
        }
        Update: {
          class_id?: string
          date?: string
          id?: string
          note?: string
          org_id?: string
          time_start?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_class_id_org_id_fkey"
            columns: ["class_id", "org_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          brief: string
          class_id: string
          date: string
          id: string
          max_score: number
          name: string
          org_id: string
        }
        Insert: {
          brief?: string
          class_id: string
          date: string
          id?: string
          max_score?: number
          name: string
          org_id: string
        }
        Update: {
          brief?: string
          class_id?: string
          date?: string
          id?: string
          max_score?: number
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_org_id_fkey"
            columns: ["class_id", "org_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "exams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel: string
          content: string
          created_at: string
          error: string | null
          exam_id: string | null
          id: string
          org_id: string
          provider_msg_id: string | null
          sent_at: string | null
          status: string
          student_id: string
        }
        Insert: {
          channel?: string
          content: string
          created_at?: string
          error?: string | null
          exam_id?: string | null
          id?: string
          org_id: string
          provider_msg_id?: string | null
          sent_at?: string | null
          status?: string
          student_id: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          error?: string | null
          exam_id?: string | null
          id?: string
          org_id?: string
          provider_msg_id?: string | null
          sent_at?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_exam_id_org_id_fkey"
            columns: ["exam_id", "org_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_student_id_org_id_fkey"
            columns: ["student_id", "org_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      org_settings: {
        Row: {
          account: string
          account_name: string
          bank: string
          org_id: string
          zalo_oa_id: string | null
        }
        Insert: {
          account?: string
          account_name?: string
          bank?: string
          org_id: string
          zalo_oa_id?: string | null
        }
        Update: {
          account?: string
          account_name?: string
          bank?: string
          org_id?: string
          zalo_oa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
          zalo_template: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: string
          zalo_template?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
          zalo_template?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          bank_txn_id: string | null
          class_id: string
          created_at: string
          id: string
          method: string
          org_id: string
          paid_at: string
          period: string
          student_id: string
        }
        Insert: {
          amount: number
          bank_txn_id?: string | null
          class_id: string
          created_at?: string
          id?: string
          method?: string
          org_id: string
          paid_at?: string
          period: string
          student_id: string
        }
        Update: {
          amount?: number
          bank_txn_id?: string | null
          class_id?: string
          created_at?: string
          id?: string
          method?: string
          org_id?: string
          paid_at?: string
          period?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_class_id_org_id_fkey"
            columns: ["class_id", "org_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_org_id_fkey"
            columns: ["student_id", "org_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          org_id: string
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          org_id: string
          phone?: string | null
          role: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          org_id?: string
          phone?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          class_id: string
          date: string
          id: string
          org_id: string
        }
        Insert: {
          class_id: string
          date: string
          id?: string
          org_id: string
        }
        Update: {
          class_id?: string
          date?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_class_id_org_id_fkey"
            columns: ["class_id", "org_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          dob: string | null
          id: string
          name: string
          org_id: string
          parent_name: string
          parent_phone: string
          parent_zalo_id: string | null
        }
        Insert: {
          created_at?: string
          dob?: string | null
          id?: string
          name: string
          org_id: string
          parent_name?: string
          parent_phone?: string
          parent_zalo_id?: string | null
        }
        Update: {
          created_at?: string
          dob?: string | null
          id?: string
          name?: string
          org_id?: string
          parent_name?: string
          parent_phone?: string
          parent_zalo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          id: string
          name: string
          org_id: string
        }
        Insert: {
          id?: string
          name: string
          org_id: string
        }
        Update: {
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_images: {
        Row: {
          id: string
          org_id: string
          position: number
          storage_path: string
          submission_id: string
        }
        Insert: {
          id?: string
          org_id: string
          position?: number
          storage_path: string
          submission_id: string
        }
        Update: {
          id?: string
          org_id?: string
          position?: number
          storage_path?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_images_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_images_submission_id_org_id_fkey"
            columns: ["submission_id", "org_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      submissions: {
        Row: {
          ai_result: Json | null
          comment: string
          created_at: string
          exam_id: string
          id: string
          note: string
          org_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          score: number | null
          status: string
          student_id: string
        }
        Insert: {
          ai_result?: Json | null
          comment?: string
          created_at?: string
          exam_id: string
          id?: string
          note?: string
          org_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          status?: string
          student_id: string
        }
        Update: {
          ai_result?: Json | null
          comment?: string
          created_at?: string
          exam_id?: string
          id?: string
          note?: string
          org_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_exam_id_org_id_fkey"
            columns: ["exam_id", "org_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "submissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_org_id_fkey"
            columns: ["student_id", "org_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      teachers: {
        Row: {
          email: string
          id: string
          name: string
          org_id: string
          phone: string
          profile_id: string | null
        }
        Insert: {
          email?: string
          id?: string
          name: string
          org_id: string
          phone?: string
          profile_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          name?: string
          org_id?: string
          phone?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attendance_by_student: {
        Args: { p_class: string }
        Returns: {
          absent: number
          excused: number
          present: number
          student_id: string
        }[]
      }
      auth_org: { Args: never; Returns: string }
      auth_role: { Args: never; Returns: string }
      create_org: {
        Args: { p_full_name?: string; p_name: string; p_type: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      my_teacher_id: { Args: never; Returns: string }
      save_attendance: {
        Args: { p_class: string; p_date: string; p_rows: Json }
        Returns: string
      }
      save_scores: {
        Args: { p_exam: string; p_rows: Json }
        Returns: undefined
      }
      teaches_class: { Args: { cid: string }; Returns: boolean }
      teaches_exam: { Args: { eid: string }; Returns: boolean }
      teaches_session: { Args: { sid: string }; Returns: boolean }
      teaches_submission: { Args: { sid: string }; Returns: boolean }
      try_uuid: { Args: { t: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
