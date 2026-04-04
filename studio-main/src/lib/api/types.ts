// ─── Shared ─────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}

// ─── Users ────────────────────────────────────────────────────────────
export type UserRole =
  | 'SUPER_ADMIN'
  | 'CEO'
  | 'CTO'
  | 'COO'
  | 'INV'
  | 'DESIGNER'
  | 'SCHOOL_ADMIN'
  | 'SUB_ADMIN'
  | 'TEACHER'
  | 'STUDENT'
  | 'PARENT'
  | 'BURSAR'
  | 'LIBRARIAN';

export interface User {
  id: string;
  uid?: string;
  matricule: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  role: UserRole;
  school?: School;
  school_id?: string;
  avatar?: string;
  is_license_paid: boolean;
  ai_request_count: number;
  annual_avg?: number;
  is_active: boolean;
  date_joined: string;
  is_platform_executive: boolean;
  is_school_admin: boolean;
}

// ─── Auth ─────────────────────────────────────────────────────────────
export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface TokenRefreshResponse {
  access: string;
}

// ─── Schools ──────────────────────────────────────────────────────────
export interface School {
  id: string;
  name: string;
  short_name: string;
  principal: string;
  motto: string;
  logo?: string;
  banner?: string;
  description: string;
  location: string;
  region: string;
  division: string;
  sub_division: string;
  city_village: string;
  address: string;
  postal_code?: string;
  phone: string;
  email: string;
  status: 'Active' | 'Suspended' | 'Pending';
  student_count: number;
  teacher_count: number;
  settings?: SchoolSettings;
}

export interface SchoolSettings {
  school: string;
  academic_year: string;
  term: string;
  max_students: number;
  max_teachers: number;
  allow_ai_features: boolean;
  ai_request_limit: number;
  licence_expiry?: string;
}

// ─── Platform ─────────────────────────────────────────────────────────
export interface PlatformSettings {
  name: string;
  logo?: string;
  payment_deadline?: string;
  honour_roll_threshold: number;
  fees: Record<string, string>;
  tutorial_links: Record<string, string>;
  maintenance_mode: boolean;
  contact_email?: string;
  contact_phone?: string;
}

export interface PublicEvent {
  id: string;
  type: 'video' | 'image';
  title: string;
  description: string;
  url: string;
  is_active: boolean;
  order: number;
}

// ─── Students ─────────────────────────────────────────────────────────
export interface Student {
  id: string;
  user: User;
  school: string;
  student_class: string;
  class_level: string;
  section: string;
  date_of_birth?: string;
  gender: 'Male' | 'Female';
  guardian_name: string;
  guardian_phone: string;
  admission_number: string;
  admission_date: string;
  annual_average?: number;
  is_on_honour_roll: boolean;
}

// ─── Grades ───────────────────────────────────────────────────────────
export interface Subject {
  id: string;
  school: string;
  name: string;
  code: string;
  level: string;
  coefficient: number;
  teacher?: string;
}

export interface Sequence {
  id: string;
  school: string;
  name: string;
  academic_year: string;
  term: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface Grade {
  id: string;
  student: string;
  subject: Subject;
  sequence: Sequence;
  score: number;
  teacher: string;
  comment: string;
  created_at: string;
}

export interface ReportCard {
  student: Student;
  sequence: Sequence;
  grades: Grade[];
  average: number;
  rank: number;
  total_students: number;
}

// ─── Attendance ───────────────────────────────────────────────────────
export interface AttendanceRecord {
  id: string;
  session: string;
  student: Student;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  excuse_note: string;
  notified_parent: boolean;
}

export interface AttendanceSummary {
  student: Student;
  total_days: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

export interface AttendanceSession {
  id: string;
  school: string;
  date: string;
  class_name: string;
  subject?: string;
  is_active: boolean;
  created_at: string;
}

// ─── Fees ─────────────────────────────────────────────────────────────
export interface FeeStructure {
  id: string;
  school: string;
  name: string;
  amount: string;
  currency: string;
  academic_year: string;
  due_date?: string;
  is_mandatory: boolean;
}

export interface Payment {
  id: string;
  school: string;
  payer: User;
  fee_structure?: FeeStructure;
  bursar: User;
  amount: string;
  currency: string;
  payment_method: 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'Cheque';
  reference_number: string;
  status: 'Pending' | 'Confirmed' | 'Rejected' | 'Refunded';
  payment_date: string;
  confirmed_at?: string;
  notes: string;
  receipt_number?: string;
}

export interface Invoice {
  id: string;
  school: string;
  student: string;
  amount: string;
  due_date: string;
  paid_date?: string;
  status: 'Pending' | 'Paid' | 'Overdue';
  created_at: string;
}

// ─── Library ──────────────────────────────────────────────────────────
export interface Book {
  id: string;
  school: string;
  title: string;
  author: string;
  isbn?: string;
  category: BookCategory;
  total_copies: number;
  available_copies: number;
  cover_image?: string;
}

export interface BookCategory {
  id: string;
  name: string;
  color: string;
}

export interface BookLoan {
  id: string;
  book: Book;
  borrower: User;
  issued_date: string;
  due_date: string;
  returned_date?: string;
  status: 'Active' | 'Returned' | 'Overdue' | 'Lost';
  fine_amount: string;
}

// ─── Announcements ────────────────────────────────────────────────────
export interface Announcement {
  id: string;
  school?: string;
  sender: User;
  title: string;
  content: string;
  target: string;
  target_user?: string;
  is_pinned: boolean;
  expires_at?: string;
  view_count: number;
  is_read: boolean;
  created_at: string;
}

// ─── Community ────────────────────────────────────────────────────────
export interface Testimony {
  id: string;
  user: User;
  school_name: string;
  role_display: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface CommunityBlog {
  id: string;
  author: User;
  title: string;
  image?: string;
  paragraphs: string[];
  is_published: boolean;
  slug: string;
  view_count: number;
  created_at: string;
}

export interface BlogComment {
  id: string;
  blog: string;
  author: User;
  content: string;
  created_at: string;
}

// ─── Feedback ─────────────────────────────────────────────────────────
export interface Feedback {
  id: string;
  school: string;
  sender: User;
  subject: string;
  message: string;
  status: 'New' | 'In_Progress' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  created_at: string;
}

// ─── Orders ───────────────────────────────────────────────────────────
export interface Order {
  id: string;
  full_name: string;
  occupation: string;
  school_name: string;
  whatsapp_number: string;
  email: string;
  region: string;
  status: 'pending' | 'contacted' | 'processed' | 'rejected';
  created_at: string;
}

// ─── Support ──────────────────────────────────────────────────────────
export interface SupportContribution {
  id: string;
  user: User;
  school?: string;
  amount: string;
  payment_method: string;
  phone: string;
  message: string;
  status: 'New' | 'Verified' | 'Rejected';
  created_at: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────
export interface Conversation {
  id: string;
  participants: User[];
  conversation_type: 'direct' | 'group' | 'official' | 'support';
  name?: string;
  last_message?: string;
  last_message_at?: string;
}

export interface Message {
  id: string;
  conversation: string;
  sender: User;
  text: string;
  message_type: string;
  is_official: boolean;
  is_read: boolean;
  reply_to?: string;
  created_at: string;
  is_deleted: boolean;
}

// ─── Staff Remarks ────────────────────────────────────────────────────
export interface StaffRemark {
  id: string;
  staff: User;
  admin: User;
  school: string;
  text: string;
  remark_type: 'Commendation' | 'Warning' | 'Observation' | 'Disciplinary';
  is_confidential: boolean;
  acknowledged: boolean;
  created_at: string;
}

// ─── AI ───────────────────────────────────────────────────────────────
export interface AIRequest {
  id: string;
  request_type: string;
  prompt: string;
  response: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface AIInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  data: Record<string, any>;
  target_role: string;
  expires_at?: string;
}

// ─── Platform Stats ───────────────────────────────────────────────────
export interface PlatformStats {
  total_schools: number;
  active_schools: number;
  total_users: number;
  users_by_role: Record<string, number>;
  total_students: number;
  total_teachers: number;
  new_orders: number;
  total_revenue: string;
}

// ─── Query Parameters ─────────────────────────────────────────────────
export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  ordering?: string;
  school_id?: string;
  status?: string;
  [key: string]: any;
}

export interface CreateUserRequest {
  matricule: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  whatsapp?: string;
  role: UserRole;
  school_id?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  avatar?: string;
}

export interface UpdatePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
}

export interface CreateSchoolRequest {
  name: string;
  short_name: string;
  principal: string;
  motto: string;
  description: string;
  location: string;
  region: string;
  division: string;
  sub_division: string;
  city_village: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  banner?: string;
}

export interface UpdateSchoolRequest {
  name?: string;
  short_name?: string;
  principal?: string;
  motto?: string;
  description?: string;
  phone?: string;
  email?: string;
  logo?: string;
  banner?: string;
}

export interface CreateStudentRequest {
  user_id?: string;
  matricule?: string;
  name: string;
  email: string;
  phone?: string;
  student_class: string;
  class_level: string;
  section: string;
  date_of_birth?: string;
  gender: 'Male' | 'Female';
  guardian_name: string;
  guardian_phone: string;
  admission_number: string;
  admission_date: string;
}

export interface CreateGradeRequest {
  student: string;
  subject: string;
  sequence: string;
  score: number;
  comment?: string;
}

export interface BulkCreateGradesRequest {
  grades: CreateGradeRequest[];
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  target: 'all' | 'students' | 'teachers' | 'parents' | 'specific_user';
  target_user?: string;
  expires_at?: string;
}

export interface CreatePaymentRequest {
  payer_id: string;
  fee_structure_id?: string;
  amount: string;
  currency: string;
  payment_method: 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'Cheque';
  reference_number: string;
  notes?: string;
}

export interface CreateFeedbackRequest {
  subject: string;
  message: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface CreateOrderRequest {
  full_name: string;
  occupation: string;
  school_name: string;
  whatsapp_number: string;
  email: string;
  region: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  target: 'all' | 'students' | 'teachers' | 'parents' | 'specific_user';
  target_user?: string;
  expires_at?: string;
}

export interface SendMessageRequest {
  text: string;
  reply_to?: string;
}

// ─── Live Classes ──────────────────────────────────────────────────────
export type LiveClassStatus = 'upcoming' | 'live' | 'ended' | 'cancelled';
export type LiveClassPlatform = 'jitsi' | 'zoom' | 'google_meet' | 'teams';

export interface LiveClass {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  subject_name?: string;
  subject_display: string;
  teacher: string;
  teacher_name: string;
  teacher_avatar?: string;
  target_class: string;
  meeting_url?: string;
  meeting_id?: string;
  meeting_password?: string;
  platform: LiveClassPlatform;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: LiveClassStatus;
  is_live_now: boolean;
  max_participants: number;
  enrolled_count: number;
  is_recorded: boolean;
  recording_url?: string;
  created: string;
  modified: string;
}

export interface CreateLiveClassRequest {
  title: string;
  description?: string;
  subject?: string;
  subject_name?: string;
  target_class: string;
  meeting_url?: string;
  meeting_id?: string;
  meeting_password?: string;
  platform?: LiveClassPlatform;
  start_time: string;
  duration_minutes?: number;
  max_participants?: number;
}

export interface LiveClassStats {
  total: number;
  live_now: number;
  upcoming: number;
  ended_today: number;
  cancelled: number;
}
