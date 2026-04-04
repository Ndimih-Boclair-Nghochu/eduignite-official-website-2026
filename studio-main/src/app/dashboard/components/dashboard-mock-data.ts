// =====================================================
// Centralized mock data for dashboard views.
// TODO: Replace with real Firestore queries per module.
// =====================================================
// NOTE: DATA_PERIODS is used as axis labels for recharts time-series charts
// and can be retained for this purpose. All other constants should be phased
// out as real API hooks are implemented. See PAGE rewrites in TASKS.md

import { PenTool, FileEdit } from "lucide-react";

/** Chart axis labels - retain for recharts formatting */
export const DATA_PERIODS = {
  weekly: [
    { name: 'Mon', users: 120, revenue: 45000, loans: 12 },
    { name: 'Tue', users: 150, revenue: 52000, loans: 18 },
    { name: 'Wed', users: 180, revenue: 48000, loans: 15 },
    { name: 'Thu', users: 210, revenue: 61000, loans: 24 },
    { name: 'Fri', users: 250, revenue: 55000, loans: 30 },
    { name: 'Sat', users: 190, revenue: 32000, loans: 8 },
    { name: 'Sun', users: 110, revenue: 28000, loans: 5 },
  ],
  monthly: [
    { name: 'Week 1', users: 1200, revenue: 245000, performance: 14.2, loans: 85 },
    { name: 'Week 2', users: 1450, revenue: 280000, performance: 15.5, loans: 110 },
    { name: 'Week 3', users: 1100, revenue: 210000, performance: 13.8, loans: 95 },
    { name: 'Week 4', users: 1800, revenue: 350000, performance: 16.1, loans: 140 },
  ],
  yearly: [
    { name: 'Jan', users: 4500, revenue: 1200000, loans: 420 },
    { name: 'Feb', users: 5200, revenue: 1450000, loans: 480 },
    { name: 'Mar', users: 4800, revenue: 1100000, loans: 450 },
    { name: 'Apr', users: 6100, revenue: 1800000, loans: 520 },
    { name: 'May', users: 7500, revenue: 2100000, loans: 610 },
    { name: 'Jun', users: 6900, revenue: 1950000, loans: 580 },
    { name: 'Jul', users: 7200, revenue: 2300000, loans: 400 },
    { name: 'Aug', users: 8100, revenue: 2500000, loans: 350 },
    { name: 'Sep', users: 9500, revenue: 3100000, loans: 780 },
    { name: 'Oct', users: 10200, revenue: 3400000, loans: 820 },
    { name: 'Nov', users: 11500, revenue: 3800000, loans: 850 },
    { name: 'Dec', users: 12400, revenue: 4200000, loans: 900 },
  ]
};

/** Chart data - phased out when usePlatformStats hook is implemented */
export const USER_DISTRIBUTION = [
  { name: 'Students', value: 18500, color: '#264D73' },
  { name: 'Teachers', value: 2400, color: '#67D0E4' },
  { name: 'Admins', value: 124, color: '#FCD116' },
  { name: 'Founders', value: 5, color: '#CE1126' },
];

/** DEPRECATED: Replace with useStudents() + useAttendanceRecords() hooks */
export const TEACHER_CLASS_DATA = [
  { name: 'Form 1', attendance: 92, performance: 12.5 },
  { name: 'Form 2', attendance: 85, performance: 11.8 },
  { name: 'Form 3', attendance: 96, performance: 14.2 },
  { name: 'Form 4', attendance: 88, performance: 13.1 },
  { name: 'Form 5', attendance: 98, performance: 16.4 },
];

export const UPCOMING_TASKS = [
  { id: "T1", title: "Physics Seq 2 Entry", class: "Form 5", deadline: "Today, 4PM", status: "Urgent", icon: PenTool },
  { id: "T2", title: "Lab Report Review", class: "Form 3", deadline: "Tomorrow", status: "Upcoming", icon: FileEdit },
];

export const RECENT_GRADES = [
  { student: "Alice Thompson", class: "Form 5", subject: "Physics", score: "18.5/20", status: "Excellent", avatar: "https://picsum.photos/seed/s1/100/100" },
  { student: "Bob Richards", class: "Form 5", subject: "Physics", score: "14.2/20", status: "Good", avatar: "https://picsum.photos/seed/s2/100/100" },
];

export const STUDENT_SUBJECT_PERF = [
  { name: 'Physics', score: 16.5 },
  { name: 'Maths', score: 18.2 },
  { name: 'Literature', score: 14.0 },
  { name: 'Chem', score: 13.5 },
  { name: 'Biology', score: 15.8 },
];

export const STUDENT_RECENT_RESULTS = [
  { subject: "Advanced Physics", sequence: "Seq 1", score: "16.5", avg: "12.4", rank: "2nd" },
  { subject: "Mathematics", sequence: "Seq 1", score: "18.0", avg: "13.1", rank: "1st" },
  { subject: "Literature", sequence: "Seq 1", score: "14.0", avg: "11.2", rank: "5th" },
];

export const STUDENT_TODAY_SCHEDULE = [
  { time: "08:00 AM", subject: "Advanced Physics", room: "Room 402", teacher: "Dr. Tesla" },
  { time: "10:30 AM", subject: "Mathematics", room: "Hall A", teacher: "Prof. Smith" },
  { time: "01:30 PM", subject: "Literature", room: "Library B", teacher: "Ms. Bennet" },
];

export const PARENT_CHILDREN_LEDGER = [
  { id: "GBHS26S001", name: "Alice Thompson", avatar: "https://picsum.photos/seed/s1/100/100", class: "Form 5", today: "Math Exam (Hall A)", status: "At School", gpa: "16.45", attendance: "98%", feeStatus: 85, isHonourRoll: true },
  { id: "GBHS26S004", name: "Diana Thompson", avatar: "https://picsum.photos/seed/s4/100/100", class: "Form 3", today: "Biology Lab", status: "At School", gpa: "14.20", attendance: "95%", feeStatus: 40, isHonourRoll: false },
];

export const PARENT_RECENT_MARKS = [
  { child: "Alice", subject: "Physics", seq: "Seq 2", mark: "18.5/20", teacher: "Dr. Tesla", date: "Just now" },
  { child: "Diana", subject: "English", seq: "Seq 2", mark: "14.0/20", teacher: "Ms. Bennet", date: "2 hours ago" },
  { child: "Alice", subject: "Calculus", seq: "Seq 2", mark: "17.0/20", teacher: "Prof. Smith", date: "Yesterday" },
];

export const LIBRARIAN_CATEGORY_DATA = [
  { name: 'Science', count: 450, color: '#264D73' },
  { name: 'Math', count: 320, color: '#67D0E4' },
  { name: 'Literature', count: 280, color: '#FCD116' },
  { name: 'History', count: 150, color: '#CE1126' },
  { name: 'Arts', count: 120, color: '#10B981' },
];

export const LIBRARIAN_RECENT_LOANS = [
  { student: "Alice Thompson", class: "Form 5", book: "Advanced Physics", due: "Today", status: "Active", avatar: "https://picsum.photos/seed/s1/100/100" },
  { student: "Bob Richards", class: "Upper Sixth", book: "Calculus II", due: "Tomorrow", status: "Active", avatar: "https://picsum.photos/seed/s2/100/100" },
  { student: "Charlie Davis", class: "Form 3", book: "Organic Chemistry", due: "28 May", status: "Overdue", avatar: "https://picsum.photos/seed/s3/100/100" },
];

export const LIBRARIAN_LOW_STOCK = [
  { title: "General Chemistry", author: "Dr. White", available: 0, total: 10 },
  { title: "English Grammar", author: "Ms. Bennet", available: 1, total: 15 },
  { title: "Modern History", author: "Prof. Smith", available: 2, total: 8 },
];

export const MOCK_BOOKS = [
  { id: "B001", title: "Advanced Physics" },
  { id: "B002", title: "Calculus II" },
  { id: "B003", title: "Organic Chemistry" },
];

export const MOCK_STUDENTS_LIST = [
  { id: "GBHS26S001", name: "Alice Thompson" },
  { id: "GBHS26S002", name: "Bob Richards" },
  { id: "GBHS26S003", name: "Charlie Davis" },
];

export const BURSAR_REVENUE_TRENDS = [
  { name: 'Mon', revenue: 450000 },
  { name: 'Tue', revenue: 520000 },
  { name: 'Wed', revenue: 480000 },
  { name: 'Thu', revenue: 610000 },
  { name: 'Fri', revenue: 550000 },
  { name: 'Sat', revenue: 320000 },
  { name: 'Sun', revenue: 110000 },
];

export const BURSAR_FEE_DISTRIBUTION = [
  { name: 'Tuition', value: 12500000, color: '#264D73' },
  { name: 'Uniforms', value: 2450000, color: '#67D0E4' },
  { name: 'PTA', value: 1200000, color: '#FCD116' },
  { name: 'Exams', value: 850000, color: '#CE1126' },
];

export const BURSAR_RECENT_COLLECTIONS = [
  { student: "Alice Thompson", id: "GBHS26S001", type: "Tuition", amount: "50,000", method: "Cash", date: "10:30 AM", status: "Verified", avatar: "https://picsum.photos/seed/s1/100/100" },
  { student: "Bob Richards", id: "GBHS26S002", type: "Uniform", amount: "25,000", method: "Orange", date: "09:12 AM", status: "Verified", avatar: "https://picsum.photos/seed/s2/100/100" },
  { student: "Diana Prince", id: "GBHS26S004", type: "PTA", amount: "10,000", method: "MTN", date: "Yesterday", status: "Verified", avatar: "https://picsum.photos/seed/s4/100/100" },
];

export const BURSAR_CLASS_REVENUE = [
  { class: "Form 1", target: 4500000, collected: 3800000, percentage: 84 },
  { class: "Form 2", target: 4000000, collected: 2200000, percentage: 55 },
  { class: "Form 5", target: 4200000, collected: 4000000, percentage: 95 },
];

export const ADMIN_CLASS_SUMMARY = [
  { class: "Form 1", students: 45, average: 14.2, attendance: 92, revenue: 85 },
  { class: "Form 2", students: 40, average: 12.8, attendance: 85, revenue: 60 },
  { class: "Form 3", students: 38, average: 15.5, attendance: 96, revenue: 95 },
  { class: "Form 4", students: 42, average: 13.1, attendance: 88, revenue: 78 },
  { class: "Form 5", students: 42, average: 16.4, attendance: 98, revenue: 98 },
];

export const ADMIN_GOVERNANCE_LOGS = [
  { action: "Verified Sequence 1 Marks", actor: "VP Academics", time: "10:30 AM", status: "Success" },
  { action: "Authorized Fee Receipt Batch", actor: "Bursar Office", time: "09:12 AM", status: "Pending" },
  { action: "Updated Library Policy", actor: "Head Librarian", time: "Yesterday", status: "Success" },
  { action: "Class Stream Promotion Sync", actor: "System Node", time: "Yesterday", status: "Success" },
];
