export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'penumpang' | 'pengemudi' | 'admin'
export type DriverVerificationStatus = 'menunggu' | 'disetujui' | 'ditolak'
export type VehicleStatus = 'jalan' | 'merayap' | 'ngetem' | 'istirahat' | 'offline'
export type PassengerMode = 'idle' | 'jalan_kaki' | 'mencari' | 'perjalanan'
export type ReportCategory = 'pengemudi' | 'fasilitas' | 'tarif' | 'lainnya'
export type ReportStatus = 'diterima' | 'diproses' | 'selesai'
export type DocumentType = 'sim' | 'ktp' | 'stnk' | 'kir' | 'foto_kendaraan'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          name: string
          email: string
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: UserRole
          name: string
          email: string
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          name?: string
          email?: string
          phone?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      routes: {
        Row: {
          id: string
          code: string
          name: string
          origin: string
          destination: string
          color: string
          path: unknown | null
          polyline: Json
          segments: Json | null
          streets: string[]
          fare_standard: number
          fare_student: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          code: string
          name: string
          origin: string
          destination: string
          color?: string
          path?: unknown | null
          polyline?: Json
          segments?: Json | null
          streets?: string[]
          fare_standard?: number
          fare_student?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          origin?: string
          destination?: string
          color?: string
          path?: unknown | null
          polyline?: Json
          segments?: Json | null
          streets?: string[]
          fare_standard?: number
          fare_student?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      route_stops: {
        Row: {
          id: string
          route_id: string
          name: string
          stop_order: number
          is_terminal: boolean
          location: unknown
          created_at: string
        }
        Insert: {
          id?: string
          route_id: string
          name: string
          stop_order?: number
          is_terminal?: boolean
          location: unknown
          created_at?: string
        }
        Update: {
          id?: string
          route_id?: string
          name?: string
          stop_order?: number
          is_terminal?: boolean
          location?: unknown
        }
      }
      vehicles: {
        Row: {
          id: string
          plate_number: string
          route_id: string
          model: string | null
          year: number | null
          capacity: number
          status: VehicleStatus
          stnk_expiry: string | null
          kir_expiry: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plate_number: string
          route_id: string
          model?: string | null
          year?: number | null
          capacity?: number
          status?: VehicleStatus
          stnk_expiry?: string | null
          kir_expiry?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plate_number?: string
          route_id?: string
          model?: string | null
          year?: number | null
          capacity?: number
          status?: VehicleStatus
          stnk_expiry?: string | null
          kir_expiry?: string | null
          updated_at?: string
        }
      }
      driver_profiles: {
        Row: {
          id: string
          vehicle_id: string | null
          route_id: string | null
          nik: string | null
          sim_number: string | null
          verification_status: DriverVerificationStatus
          verified_at: string | null
          verified_by: string | null
          rejection_reason: string | null
          is_active_duty: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          vehicle_id?: string | null
          route_id?: string | null
          nik?: string | null
          sim_number?: string | null
          verification_status?: DriverVerificationStatus
          verified_at?: string | null
          verified_by?: string | null
          rejection_reason?: string | null
          is_active_duty?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string | null
          route_id?: string | null
          nik?: string | null
          sim_number?: string | null
          verification_status?: DriverVerificationStatus
          verified_at?: string | null
          verified_by?: string | null
          rejection_reason?: string | null
          is_active_duty?: boolean
          updated_at?: string
        }
      }
      driver_documents: {
        Row: {
          id: string
          driver_id: string
          document_type: DocumentType
          file_path: string
          file_name: string | null
          file_size: number | null
          mime_type: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          driver_id: string
          document_type: DocumentType
          file_path: string
          file_name?: string | null
          file_size?: number | null
          mime_type?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          document_type?: DocumentType
          file_path?: string
          file_name?: string | null
          file_size?: number | null
          mime_type?: string | null
        }
      }
      live_locations: {
        Row: {
          vehicle_id: string
          driver_id: string
          location: unknown
          heading: number
          speed_kph: number
          status: VehicleStatus
          seats_available: number
          last_seen_at: string
        }
        Insert: {
          vehicle_id: string
          driver_id: string
          location: unknown
          heading?: number
          speed_kph?: number
          status?: VehicleStatus
          seats_available?: number
          last_seen_at?: string
        }
        Update: {
          vehicle_id?: string
          driver_id?: string
          location?: unknown
          heading?: number
          speed_kph?: number
          status?: VehicleStatus
          seats_available?: number
          last_seen_at?: string
        }
      }
      passenger_requests: {
        Row: {
          id: string
          passenger_id: string
          route_id: string
          location: unknown
          mode: PassengerMode
          matched_vehicle_id: string | null
          is_active: boolean
          created_at: string
          expires_at: string
          matched_at: string | null
        }
        Insert: {
          id?: string
          passenger_id: string
          route_id: string
          location: unknown
          mode?: PassengerMode
          matched_vehicle_id?: string | null
          is_active?: boolean
          created_at?: string
          expires_at?: string
          matched_at?: string | null
        }
        Update: {
          id?: string
          passenger_id?: string
          route_id?: string
          location?: unknown
          mode?: PassengerMode
          matched_vehicle_id?: string | null
          is_active?: boolean
          expires_at?: string
          matched_at?: string | null
        }
      }
      passenger_trips: {
        Row: {
          id: string
          passenger_id: string
          driver_id: string | null
          vehicle_id: string | null
          route_id: string | null
          origin_name: string
          destination_name: string
          origin_location: unknown | null
          destination_location: unknown | null
          fare: number
          rating: number | null
          started_at: string
          finished_at: string | null
        }
        Insert: {
          id?: string
          passenger_id: string
          driver_id?: string | null
          vehicle_id?: string | null
          route_id?: string | null
          origin_name: string
          destination_name: string
          origin_location?: unknown | null
          destination_location?: unknown | null
          fare?: number
          rating?: number | null
          started_at?: string
          finished_at?: string | null
        }
        Update: {
          id?: string
          passenger_id?: string
          driver_id?: string | null
          vehicle_id?: string | null
          route_id?: string | null
          origin_name?: string
          destination_name?: string
          origin_location?: unknown | null
          destination_location?: unknown | null
          fare?: number
          rating?: number | null
          finished_at?: string | null
        }
      }
      reports: {
        Row: {
          id: string
          code: string
          reporter_id: string
          vehicle_id: string | null
          plate_number: string | null
          category: ReportCategory
          subject: string
          description: string
          evidence_urls: string[]
          status: ReportStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          reporter_id: string
          vehicle_id?: string | null
          plate_number?: string | null
          category?: ReportCategory
          subject: string
          description: string
          evidence_urls?: string[]
          status?: ReportStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          reporter_id?: string
          vehicle_id?: string | null
          plate_number?: string | null
          category?: ReportCategory
          subject?: string
          description?: string
          evidence_urls?: string[]
          status?: ReportStatus
          updated_at?: string
        }
      }
      report_updates: {
        Row: {
          id: string
          report_id: string
          admin_id: string
          status: ReportStatus
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          admin_id: string
          status: ReportStatus
          notes: string
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          admin_id?: string
          status?: ReportStatus
          notes?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string | null
          title: string
          content: string
          is_broadcast: boolean
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id?: string | null
          title: string
          content: string
          is_broadcast?: boolean
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string | null
          title?: string
          content?: string
          is_broadcast?: boolean
          is_read?: boolean
        }
      }
    }
    Views: {
      view_public_stats: {
        Row: {
          total_active_routes: number
          total_active_vehicles: number
          total_verified_drivers: number
          total_reports: number
          total_resolved_reports: number
          report_resolution_rate: number
        }
      }
    }
  }
}

