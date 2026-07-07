export interface StudentDrive {
  id: string
  company: string
  role: string
  packageLpa: string
  minCgpa: number
  deadline: string
  status: 'Eligible' | 'Applied' | 'Not Eligible'
  reason?: string
}

export interface StudentNotification {
  id: number
  title: string
  desc: string
  time: string
  category: string
  read: boolean
}

export interface PlacementUpdateRequest {
  id: string
  company: string
  packageLpa: string
  offerLetter: string
  submittedAt: string
  status: 'Pending' | 'Approved' | 'Rejected'
  source: 'Student Self-Declaration'
}

export interface StudentProfileDraft {
  fullName: string
  rollNumber: string
  department: string
  email: string
  alternateEmail: string
  phone: string
  cgpa: string
  tenthPercentage: string
  twelfthPercentage: string
  activeBacklogs: string
  resumeName: string
  marksheet10: string
  marksheet12: string
}

export const studentProfile: StudentProfileDraft = {
  fullName: 'Aarav Sharma',
  rollNumber: '21JR1A0501',
  department: 'Computer Science & Engineering',
  email: 'aarav.sharma@college.edu',
  alternateEmail: 'aarav.personal@example.com',
  phone: '9876543210',
  cgpa: '8.42',
  tenthPercentage: '92.4',
  twelfthPercentage: '89.6',
  activeBacklogs: '0',
  resumeName: 'Aarav_Sharma_Resume.pdf',
  marksheet10: '10th_Marksheet.pdf',
  marksheet12: '12th_Marksheet.pdf',
}

export const studentForms = [
  { name: 'Placement Registration', status: 'Submitted' },
  { name: 'Amazon Application', status: 'Draft Saved' },
  { name: 'Resume Verification', status: 'Verified' },
]

export const studentAnnouncements = [
  'Placement orientation on July 15 at Main Auditorium.',
  'Product-company eligibility rules are updated in the student handbook.',
  'Mock interviews start next Monday; registration closes this Friday.',
]

export const studentDrives: StudentDrive[] = [
  {
    id: 'DRV-001',
    company: 'Amazon',
    role: 'Software Development Engineer - 1',
    packageLpa: 'Rs. 48.0 LPA',
    minCgpa: 8.0,
    deadline: '2026-07-28',
    status: 'Eligible',
  },
  {
    id: 'DRV-002',
    company: 'Infosys',
    role: 'Systems Engineer Specialist',
    packageLpa: 'Rs. 9.2 LPA',
    minCgpa: 6.0,
    deadline: '2026-07-30',
    status: 'Applied',
  },
  {
    id: 'DRV-003',
    company: 'Wipro',
    role: 'Project Engineer',
    packageLpa: 'Rs. 6.8 LPA',
    minCgpa: 6.0,
    deadline: '2026-08-02',
    status: 'Eligible',
  },
  {
    id: 'DRV-004',
    company: 'TCS',
    role: 'Ninja Developer',
    packageLpa: 'Rs. 7.5 LPA',
    minCgpa: 6.0,
    deadline: '2026-07-20',
    status: 'Applied',
  },
  {
    id: 'DRV-005',
    company: 'Google',
    role: 'Software Engineer Graduate',
    packageLpa: 'Rs. 52.0 LPA',
    minCgpa: 8.5,
    deadline: '2026-08-10',
    status: 'Not Eligible',
    reason: 'CGPA below 8.50',
  },
  {
    id: 'DRV-006',
    company: 'Microsoft',
    role: 'Support Engineer',
    packageLpa: 'Rs. 18.0 LPA',
    minCgpa: 7.0,
    deadline: '2026-07-28',
    status: 'Eligible',
  },
]

export const studentNotifications: StudentNotification[] = [
  {
    id: 1,
    title: 'Amazon shortlist released',
    desc: 'You are shortlisted for the online coding assessment for Amazon SDE-1.',
    time: '2 hours ago',
    category: 'Shortlist',
    read: false,
  },
  {
    id: 2,
    title: 'Complete your registration details',
    desc: 'Upload your verified class 12 marksheet before applying to more drives.',
    time: '1 day ago',
    category: 'Action Required',
    read: false,
  },
  {
    id: 3,
    title: 'TCS pre-placement talk scheduled',
    desc: 'The TCS Ninja and Digital pre-placement talk is on July 10, 2026 at 10:00 AM.',
    time: '3 days ago',
    category: 'Drives',
    read: true,
  },
  {
    id: 4,
    title: 'Wipro registration starts',
    desc: 'The Wipro registration link is now active in your drives section.',
    time: '4 days ago',
    category: 'Drives',
    read: true,
  },
]

export const initialPlacementUpdateRequests: PlacementUpdateRequest[] = [
  {
    id: 'REQ-001',
    company: 'Capgemini',
    packageLpa: 'Rs. 7.2 LPA',
    offerLetter: 'Capgemini_Offer_Letter.pdf',
    submittedAt: '2026-06-20 14:10',
    status: 'Pending',
    source: 'Student Self-Declaration',
  },
]
