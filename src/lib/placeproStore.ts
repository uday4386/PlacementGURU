import { useState, useEffect } from 'react'
import { loadDraft, saveDraft } from './formDraft'
import { getAuthToken } from './auth'

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const selectedYear = localStorage.getItem('placepro-selected-academic-year')
  if (selectedYear) {
    headers.set('X-Academic-Year', selectedYear)
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
  academicYear?: string
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
  companyMinCgpa?: string
  companyMaxBacklogs?: string
  companyAcademicYear?: string
  companyRemarks?: string
  academicYear?: string
}

export interface FormSubmission {
  id: string
  formId: string
  roll: string
  name: string
  submittedAt: string
  status: 'Approved' | 'Pending'
  values: Record<string, string>
  academicYear?: string
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
  minCgpa?: string
  maxBacklogs?: string
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
  academicYear?: string
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

function getSelectedAcademicYear() {
  try {
    return localStorage.getItem('placepro-selected-academic-year') || '2025-2026'
  } catch {
    return '2025-2026'
  }
}

function scopedDraftKey(key: string) {
  return `${key}:${getSelectedAcademicYear()}`
}

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
  academicYear?: string
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
let cacheMasterHistory: UploadHistoryEntry[] = []

export async function initializeStore() {
  // Skip if no auth token — user is not logged in yet
  const token = getAuthToken()
  if (!token) {
    return
  }
  try {
    const [masterRows, forms, submissions, companies, placements, notifications, masterHistory] = await Promise.all([
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
      }),
      fetchWithAuth('/api/master-history').then(res => {
        if (!res.ok) return []
        return res.json()
      }).catch(() => [])
    ])

    cacheMasterRows = masterRows
    cacheForms = forms
    cacheSubmissions = submissions
    cacheCompanies = companies
    cachePlacements = placements
    cacheNotifications = notifications
    cacheMasterHistory = masterHistory
    notifyListeners()
  } catch (err) {
    console.error('Failed to initialize PlacePro store from API, using local storage fallbacks.', err)
    cacheMasterRows = loadDraft<MasterStudentRow[]>(scopedDraftKey(MASTER_ROWS_KEY)) ?? []
    
    const loadedForms = loadDraft<PlacementForm[]>(scopedDraftKey(FORMS_KEY))
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
      saveDraft(scopedDraftKey(FORMS_KEY), cacheForms)
    } else {
      cacheForms = loadedForms
    }

    cacheSubmissions = loadDraft<FormSubmission[]>(scopedDraftKey(SUBMISSIONS_KEY)) ?? []
    cacheCompanies = loadDraft<CompanyDrive[]>(scopedDraftKey(COMPANIES_KEY)) ?? []
    cachePlacements = loadDraft<PlacementOffer[]>(scopedDraftKey(PLACEMENTS_KEY)) ?? []
    cacheNotifications = loadDraft<PlacementNotification[]>(scopedDraftKey(PLACEMENT_NOTIFICATIONS_KEY)) ?? []
    cacheMasterHistory = loadDraft<UploadHistoryEntry[]>(scopedDraftKey(MASTER_HISTORY_KEY)) ?? []
    notifyListeners()
  }
}

export function loadMasterRows() {
  return cacheMasterRows
}

export function saveMasterRows(rows: MasterStudentRow[]) {
  cacheMasterRows = rows
  saveDraft(scopedDraftKey(MASTER_ROWS_KEY), rows)
  notifyListeners()
  fetchWithAuth('/api/master-rows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
  }).catch((err) => console.error('Failed to save master rows to API', err))
}

export function loadMasterHistory(): UploadHistoryEntry[] {
  return cacheMasterHistory
}

export function saveMasterHistory(history: UploadHistoryEntry[]) {
  cacheMasterHistory = history
  saveDraft(scopedDraftKey(MASTER_HISTORY_KEY), history)
  notifyListeners()

  const latestLog = history[0]
  if (latestLog) {
    fetchWithAuth('/api/master-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latestLog),
    }).catch((err) => console.error('Failed to save master history to API', err))
  }
}

export function loadPlacementForms(): PlacementForm[] {
  return cacheForms
}

export async function savePlacementForms(forms: PlacementForm[]) {
  cacheForms = forms
  saveDraft(scopedDraftKey(FORMS_KEY), forms)
  loadDeptBroadcasts()
  notifyListeners()
  try {
    const res = await fetchWithAuth('/api/placement-forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forms),
    })
    if (res.ok) {
      try {
        const [formsRes, notifRes] = await Promise.all([
          fetchWithAuth('/api/placement-forms'),
          fetchWithAuth('/api/placement-notifications')
        ])
        if (formsRes.ok) {
          const syncedForms = await formsRes.json()
          cacheForms = syncedForms
          saveDraft(scopedDraftKey(FORMS_KEY), syncedForms)
        }
        if (notifRes.ok) {
          const notifs = await notifRes.json()
          cacheNotifications = notifs
          saveDraft(scopedDraftKey(PLACEMENT_NOTIFICATIONS_KEY), notifs)
        }
        notifyListeners()
      } catch (e) {
        console.error('Failed to sync placement forms/notifications after save:', e)
      }
    }
  } catch (err) {
    console.error('Failed to save placement forms to API', err)
  }
}

export function loadFormSubmissions(): FormSubmission[] {
  return cacheSubmissions
}

export async function saveFormSubmissions(submissions: FormSubmission[]) {
  cacheSubmissions = submissions
  saveDraft(scopedDraftKey(SUBMISSIONS_KEY), submissions)
  notifyListeners()
  try {
    const res = await fetchWithAuth('/api/form-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissions),
    })
    if (res.ok) {
      const fetchRes = await fetchWithAuth('/api/form-submissions')
      if (fetchRes.ok) {
        const synced = await fetchRes.json()
        cacheSubmissions = synced
        saveDraft(scopedDraftKey(SUBMISSIONS_KEY), synced)
        notifyListeners()
      }
    }
  } catch (err) {
    console.error('Failed to save submissions to API', err)
  }
}

export async function submitSingleFormSubmission(submission: FormSubmission) {
  const cleanRoll = submission.roll.trim().toUpperCase();
  const existingIdx = cacheSubmissions.findIndex(
    s => s.formId === submission.formId && s.roll.trim().toUpperCase() === cleanRoll
  );
  if (existingIdx >= 0) {
    cacheSubmissions[existingIdx] = submission;
  } else {
    cacheSubmissions.push(submission);
  }
  saveDraft(scopedDraftKey(SUBMISSIONS_KEY), cacheSubmissions);
  notifyListeners();

  try {
    await fetchWithAuth('/api/form-submissions/single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    });
  } catch (err) {
    console.error('Failed to submit single form submission', err);
  }
}

export function loadCompanies(): CompanyDrive[] {
  return cacheCompanies
}

export async function saveCompanies(companies: CompanyDrive[]) {
  cacheCompanies = companies
  saveDraft(scopedDraftKey(COMPANIES_KEY), companies)
  notifyListeners()
  try {
    const res = await fetchWithAuth('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(companies),
    })
    if (res.ok) {
      const fetchRes = await fetchWithAuth('/api/companies')
      if (fetchRes.ok) {
        const synced = await fetchRes.json()
        cacheCompanies = synced
        saveDraft(scopedDraftKey(COMPANIES_KEY), synced)
        notifyListeners()
      }
    }
  } catch (err) {
    console.error('Failed to save companies to API', err)
  }
}

export function loadPlacements(): PlacementOffer[] {
  return cachePlacements
}

export async function savePlacements(placements: PlacementOffer[]) {
  cachePlacements = placements
  saveDraft(scopedDraftKey(PLACEMENTS_KEY), placements)
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

export function loadDeptBroadcasts(): any[] {
  try {
    const raw = localStorage.getItem('placepro-broadcasts')
    let broadcasts: any[] = raw ? JSON.parse(raw) : []

    const forms = cacheForms.length > 0 ? cacheForms : (loadDraft<PlacementForm[]>(scopedDraftKey(FORMS_KEY)) ?? [])
    let updated = false
    forms.forEach((form) => {
      if (form.status === 'Active' && (!form.hasCompanyDrive || form.type === 'Survey' || form.name.toLowerCase().includes('survey'))) {
        const notifId = `FORM-NOTIF-${form.id}`
        if (!broadcasts.some((b) => b.id === notifId)) {
          broadcasts.unshift({
            id: notifId,
            title: `SURVEY FORM: ${form.name}`,
            message: `A new survey / general form "${form.name}" (${form.type || 'Survey'}) has been published. Please complete and submit your response before the deadline (${form.endDate || '2026-07-31'}).`,
            type: 'announcement',
            branch: 'All',
            sender: 'Placement Cell',
            createdAt: form.created || new Date().toISOString(),
            formId: form.id,
          })
          updated = true
        }
      }
    })
    if (updated && typeof localStorage !== 'undefined') {
      localStorage.setItem('placepro-broadcasts', JSON.stringify(broadcasts))
    }
    return broadcasts
  } catch {
    return []
  }
}

export async function syncPlacementNotifications(): Promise<PlacementNotification[]> {
  try {
    const res = await fetchWithAuth('/api/placement-notifications')
    if (res.ok) {
      const notifs = await res.json()
      cacheNotifications = notifs
      saveDraft(scopedDraftKey(PLACEMENT_NOTIFICATIONS_KEY), notifs)
      notifyListeners()
      return notifs
    }
  } catch (err) {
    console.error('Failed to sync placement notifications from API:', err)
  }
  return cacheNotifications
}

export async function savePlacementNotifications(notifications: PlacementNotification[]) {
  cacheNotifications = notifications
  saveDraft(scopedDraftKey(PLACEMENT_NOTIFICATIONS_KEY), notifications)
  notifyListeners()
  try {
    const res = await fetchWithAuth('/api/placement-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifications),
    })
    if (res.ok) {
      await syncPlacementNotifications()
    }
  } catch (err) {
    console.error('Failed to save notifications to API', err)
  }
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
  saveDraft(scopedDraftKey(MASTER_ROWS_KEY), [])
  saveDraft(scopedDraftKey(MASTER_HISTORY_KEY), [])
  saveDraft(scopedDraftKey(FORMS_KEY), [])
  saveDraft(scopedDraftKey(SUBMISSIONS_KEY), [])
  saveDraft(scopedDraftKey(COMPANIES_KEY), [])
  saveDraft(scopedDraftKey(PLACEMENTS_KEY), [])
  saveDraft(scopedDraftKey(PLACEMENT_NOTIFICATIONS_KEY), [])

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
