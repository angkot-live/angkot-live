// Generated from the local database by npm run db:types.
export type { Database, Json } from './database.generated'
import type { Database } from './database.generated'
export type UserRole = Database['public']['Enums']['user_role']
export type DriverVerificationStatus =
  Database['public']['Enums']['driver_verification_status']
export type VehicleStatus = Database['public']['Enums']['vehicle_status']
export type PassengerMode = Database['public']['Enums']['passenger_mode']
export type ReportCategory = Database['public']['Enums']['report_category']
export type ReportStatus = Database['public']['Enums']['report_status']
export type DocumentType = Database['public']['Enums']['document_type']
