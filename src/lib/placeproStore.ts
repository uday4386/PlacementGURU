import { useState, useEffect } from 'react'
import { loadDraft, saveDraft } from './formDraft'
import { getAuthToken } from './auth'

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(url, { ...options, headers })
}

export interface MasterStudentRow {
  rollNumber: string
  firstName: string
  lastName: string
  fullName: string
  mailId: string
  alternateMailId: string
  phoneNumber: string
  alternatePhoneNumber: string
  aadharNumber: string
  gender: string
  country: string
  state: string
  city: string
  branch: string
  dateOfBirth: string
  tenthPercentage: string
  tenthYop: string
  tenthBoard: string
  twelfthPercentage: string
  twelfthYop: string
  twelfthBoard: string
  collegeName: string
  btechCgpa: string
  btechYop: string
  activeBacklogs: string
  noOfBacklogs: string
}

export interface FormFieldConfig {
  id: string
  label: string
  type:
    | 'text'
    | 'number'
    | 'email'
    | 'date'
    | 'textarea'
    | 'select'
    | 'radio'
    | 'checkbox'
    | 'file'
  required: boolean
  placeholder?: string
  options?: string[]
  // Constraints (Google Form-style response validation)
  minValue?: string
  maxValue?: string
  minLength?: string
  maxLength?: string
  pattern?: string
  customErrorMessage?: string
}

export interface PlacementForm {
  id: string
  name: string
  type: string
  status: 'Active' | 'Closed' | 'Draft'
  created: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  total: number
  fields: FormFieldConfig[]
  hasCompanyDrive?: boolean
  companyName?: string
  companySector?: string
  companyCategory?: string
  companyLocation?: string
  companyDriveMode?: string
  companyJobType?: string
  companyPkgMin?: string
  companyPkgMax?: string
  companyAcademicYear?: string
  companyRemarks?: string
}

export interface FormSubmission {
  id: string
  formId: string
  roll: string
  name: string
  submittedAt: string
  status: 'Approved' | 'Pending'
  values: Record<string, string>
}

export interface CompanyDrive {
  id: string
  name: string
  sector: string
  type: string
  location: string
  drives: number
  hires: number
  package: string
  status: 'Active' | 'Completed' | 'Upcoming'
  mode: string
  jobType: string
  academicYear: string
  remarks?: string
  formId?: string
}

export interface PlacementOffer {
  student: string
  id: string
  branch: string
  company: string
  role: string
  package: string
  date: string
  type: 'On-campus' | 'Off-campus'
  email?: string
  phone?: string
}

export interface UploadHistoryEntry {
  fileName: string
  uploadDate: string
  recordsCount: number
  uploadedBy: string
  rows: MasterStudentRow[]
}

export const MASTER_ROWS_KEY = 'placepro-master-rows'
export const MASTER_HISTORY_KEY = 'placepro-master-history'
export const FORMS_KEY = 'placepro-forms'
export const SUBMISSIONS_KEY = 'placepro-form-submissions'
export const COMPANIES_KEY = 'placepro-companies'
export const PLACEMENTS_KEY = 'placepro-placements'
export const PLACEMENT_NOTIFICATIONS_KEY = 'placepro-placement-notifications'

export interface PlacementNotification {
  id: string
  rollNumber: string
  studentName: string
  company: string
  role: string
  package: string
  date: string
  type: string
  createdAt: string
  read: boolean
}

type Listener = () => void
const listeners = new Set<Listener>()

export function subscribeToStore(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l()
    } catch (err) {
      console.error('Error notifying store listener:', err)
    }
  })
}

let cacheMasterRows: MasterStudentRow[] = []
let cacheForms: PlacementForm[] = []
let cacheSubmissions: FormSubmission[] = []
let cacheCompanies: CompanyDrive[] = []
let cachePlacements: PlacementOffer[] = []
let cacheNotifications: PlacementNotification[] = []

export async function initializeStore() {
  try {
    const [masterRows, forms, submissions, companies, placements, notifications] = await Promise.all([
      fetchWithAuth('/api/master-rows').then(res => {
        if (!res.ok) throw new Error('API fetch failed')
        return res.json()
      }),
      fetchWithAuth('/api/placement-forms').then(res => {
        if (!res.ok) throw new Error('API fetch failed')
        return res.json()
      }),
      fetchWithAuth('/api/form-submissions').then(res => {
        if (!res.ok) throw new Error('API fetch failed')
        return res.json()
      }),
      fetchWithAuth('/api/companies').then(res => {
        if (!res.ok) throw new Error('API fetch failed')
        return res.json()
      }),
      fetchWithAuth('/api/placements').then(res => {
        if (!res.ok) throw new Error('API fetch failed')
        return res.json()
      }),
      fetchWithAuth('/api/placement-notifications').then(res => {
        if (!res.ok) throw new Error('API fetch failed')
        return res.json()
      })
    ])

    cacheMasterRows = masterRows
    cacheForms = forms
    cacheSubmissions = submissions
    cacheCompanies = companies
    cachePlacements = placements
    cacheNotifications = notifications
    notifyListeners()
  } catch (err) {
    console.error('Failed to initialize PlacePro store from API, using local storage fallbacks.', err)
    cacheMasterRows = loadDraft<MasterStudentRow[]>(MASTER_ROWS_KEY) ?? []
    
    const loadedForms = loadDraft<PlacementForm[]>(FORMS_KEY)
    if (!loadedForms) {
      cacheForms = [
        {
          id: 'FRM-001',
          name: 'Placement Registration 2026',
          type: 'Registration',
          status: 'Active',
          created: '2025-12-01',
          startDate: '2025-12-01',
          startTime: '09:00',
          endDate: '2026-07-31',
          endTime: '23:59',
          total: 1200,
          fields: [
            { id: 'fld-roll', label: 'Roll Number', type: 'text', required: true, placeholder: 'Enter roll number' },
            { id: 'fld-name', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter full name' },
            { id: 'fld-branch', label: 'Branch', type: 'select', required: true, options: ['CSE', 'IT', 'ECE', 'ME', 'EE', 'CE'] },
            { id: 'fld-cgpa', label: 'CGPA', type: 'number', required: true, placeholder: 'Enter current CGPA' },
            { id: 'fld-resume', label: 'Resume Upload', type: 'file', required: true }
          ]
        },
        {
          id: 'FRM-002',
          name: 'Amazon Drive Application',
          type: 'Drive Application',
          status: 'Active',
          created: '2026-06-15',
          startDate: '2026-06-15',
          startTime: '08:00',
          endDate: '2026-07-25',
          endTime: '18:00',
          total: 950,
          fields: [
            { id: 'fld-roll-2', label: 'Roll Number', type: 'text', required: true },
            { id: 'fld-name-2', label: 'Full Name', type: 'text', required: true },
            { id: 'fld-email-2', label: 'Alternate Email', type: 'email', required: true },
            { id: 'fld-resume-2', label: 'Resume Upload', type: 'file', required: true }
          ]
        }
      ]
      saveDraft(FORMS_KEY, cacheForms)
    } else {
      cacheForms = loadedForms
    }

    cacheSubmissions = loadDraft<FormSubmission[]>(SUBMISSIONS_KEY) ?? []
    cacheCompanies = loadDraft<CompanyDrive[]>(COMPANIES_KEY) ?? []
    cachePlacements = loadDraft<PlacementOffer[]>(PLACEMENTS_KEY) ?? []
    cacheNotifications = loadDraft<PlacementNotification[]>(PLACEMENT_NOTIFICATIONS_KEY) ?? []
    notifyListeners()
  }
}

export function loadMasterRows() {
  return cacheMasterRows
}

export function saveMasterRows(rows: MasterStudentRow[]) {
  cacheMasterRows = rows
  saveDraft(MASTER_ROWS_KEY, rows)
  notifyListeners()
  fetchWithAuth('/api/master-rows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
  }).catch((err) => console.error('Failed to save master rows to API', err))
}

export function loadMasterHistory(): UploadHistoryEntry[] {
  return loadDraft<UploadHistoryEntry[]>(MASTER_HISTORY_KEY) ?? []
}

export function saveMasterHistory(history: UploadHistoryEntry[]) {
  saveDraft(MASTER_HISTORY_KEY, history)
  notifyListeners()
}

export function loadPlacementForms(): PlacementForm[] {
  return cacheForms
}

export function savePlacementForms(forms: PlacementForm[]) {
  cacheForms = forms
  saveDraft(FORMS_KEY, forms)
  notifyListeners()
  fetchWithAuth('/api/placement-forms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(forms),
  }).catch((err) => console.error('Failed to save placement forms to API', err))
}

export function loadFormSubmissions(): FormSubmission[] {
  return cacheSubmissions
}

export function saveFormSubmissions(submissions: FormSubmission[]) {
  cacheSubmissions = submissions
  saveDraft(SUBMISSIONS_KEY, submissions)
  notifyListeners()
  fetchWithAuth('/api/form-submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submissions),
  }).catch((err) => console.error('Failed to save submissions to API', err))
}

export function loadCompanies(): CompanyDrive[] {
  return cacheCompanies
}

export function saveCompanies(companies: CompanyDrive[]) {
  cacheCompanies = companies
  saveDraft(COMPANIES_KEY, companies)
  notifyListeners()
  fetchWithAuth('/api/companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(companies),
  }).catch((err) => console.error('Failed to save companies to API', err))
}

export function loadPlacements(): PlacementOffer[] {
  return cachePlacements
}

export async function savePlacements(placements: PlacementOffer[]) {
  cachePlacements = placements
  saveDraft(PLACEMENTS_KEY, placements)
  notifyListeners()
  try {
    const res = await fetchWithAuth('/api/placements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(placements),
    })
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${await res.text()}`)
    }
  } catch (err) {
    console.error('Failed to save placements to API', err)
    throw err
  }
}

export function loadPlacementNotifications(): PlacementNotification[] {
  return cacheNotifications
}

export function savePlacementNotifications(notifications: PlacementNotification[]) {
  cacheNotifications = notifications
  saveDraft(PLACEMENT_NOTIFICATIONS_KEY, notifications)
  notifyListeners()
  fetchWithAuth('/api/placement-notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notifications),
  }).catch((err) => console.error('Failed to save notifications to API', err))
}

export function addPlacementNotification(offer: PlacementOffer) {
  const existing = loadPlacementNotifications()
  const filtered = existing.filter(
    (n) =>
      !(
        n.rollNumber === offer.id.trim().toUpperCase() &&
        n.company.toLowerCase() === offer.company.toLowerCase()
      )
  )

  const notification: PlacementNotification = {
    id: `PNOTIF-${Date.now()}`,
    rollNumber: offer.id.trim().toUpperCase(),
    studentName: offer.student,
    company: offer.company,
    role: offer.role,
    package: offer.package,
    date: offer.date,
    type: offer.type,
    createdAt: new Date().toISOString(),
    read: false,
  }
  savePlacementNotifications([notification, ...filtered])
}

/**
 * Wipe ALL live data from both server and client-side store.
 * Called when admin permanently deletes an academic year's data.
 */
export async function wipeAllData() {
  // Clear all caches
  cacheMasterRows = []
  cacheForms = []
  cacheSubmissions = []
  cacheCompanies = []
  cachePlacements = []
  cacheNotifications = []

  // Clear local storage drafts
  saveDraft(MASTER_ROWS_KEY, [])
  saveDraft(MASTER_HISTORY_KEY, [])
  saveDraft(FORMS_KEY, [])
  saveDraft(SUBMISSIONS_KEY, [])
  saveDraft(COMPANIES_KEY, [])
  saveDraft(PLACEMENTS_KEY, [])
  saveDraft(PLACEMENT_NOTIFICATIONS_KEY, [])

  // Sync empty arrays to server
  await Promise.all([
    fetchWithAuth('/api/master-rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([]),
    }),
    fetchWithAuth('/api/placement-forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([]),
    }),
    fetchWithAuth('/api/form-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([]),
    }),
    fetchWithAuth('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([]),
    }),
    fetchWithAuth('/api/placements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([]),
    }),
    fetchWithAuth('/api/placement-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([]),
    }),
  ]).catch((err) => console.error('Failed to wipe server data', err))

  // Notify all listeners so UI updates immediately
  notifyListeners()
}

// React State Selector Hook
export function useStoreState<T>(selector: () => T): T {
  const [state, setState] = useState<T>(selector)

  useEffect(() => {
    setState(selector())
    const unsubscribe = subscribeToStore(() => {
      setState(selector())
    })
    return unsubscribe
  }, [selector])

  return state
}

// Background Sync / Revalidation
let isSyncing = false
export async function refreshStore() {
  if (isSyncing) return
  isSyncing = true
  try {
    await initializeStore()
  } catch (err) {
    console.error('Failed background sync of PlacePro store', err)
  } finally {
    isSyncing = false
  }
}

// Set up periodic sync and focus sync in the browser
if (typeof window !== 'undefined') {
  // Sync on window focus
  window.addEventListener('focus', () => {
    refreshStore()
  })

  // Periodic sync every 15 seconds
  setInterval(() => {
    refreshStore()
  }, 15000)
}
