import React, { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { getAuthSession } from './auth'

const STORAGE_KEY = "placepro-selected-academic-year"

export interface AcademicYear {
  id: number
  academic_year: string
  start_date: string
  end_date: string
  status: 'ACTIVE' | 'ARCHIVED' | 'UPCOMING'
  college_name?: string
  university?: string
  college_location?: string
  college_website?: string
  created_at: string
}

export function isValidAcademicYear(year: string): boolean {
  return /^\d{4}-\d{4}$/.test(year)
}

export function getAcademicYearFromDate(dateString: string): string {
  if (!dateString) return ""
  const date = new Date(dateString.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  // June (month index 5) or later is part of next academic year
  return date.getMonth() >= 5 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

export function getAcademicYearFromYop(yop: string | number): string {
  const val = Number.parseInt(String(yop), 10)
  return Number.isNaN(val) ? "" : `${val - 1}-${val}`
}

export function normalizeAcademicYear(year: string): string {
  if (!year) return ""
  const cleaned = String(year)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, "")
    .trim()
  const match = cleaned.match(/^(\d{4})-(\d{2}|\d{4})$/)
  if (!match) return cleaned
  const start = Number.parseInt(match[1], 10)
  const endStr = match[2]
  const end = endStr.length === 2 ? Math.floor(start / 100) * 100 + Number.parseInt(endStr, 10) : Number.parseInt(endStr, 10)
  return Number.isNaN(start) || Number.isNaN(end) ? cleaned : `${start}-${end}`
}

function getDefaultAcademicYear(): string {
  return getAcademicYearFromDate(new Date().toISOString())
}

function getInitialAcademicYear(): string {
  try {
    const session = getAuthSession()
    if (session && session.role !== 'admin' && session.academicYear) {
      return session.academicYear
    }
    const stored = localStorage.getItem(STORAGE_KEY) ?? ""
    if (isValidAcademicYear(stored)) return stored
  } catch {}
  return getDefaultAcademicYear()
}

interface AcademicYearContextType {
  selectedYear: string
  setSelectedYear: (year: string) => void
  academicYears: AcademicYear[]
  activeYear: string
  isLoading: boolean
  refetchYears: () => Promise<void>
}

const AcademicYearContext = createContext<AcademicYearContextType | null>(null)

export function AcademicYearProvider({ children }: { children: React.ReactNode }) {
  const [selectedYear, setSelectedYearState] = useState(getInitialAcademicYear)
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchYears = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/academic-years')
      if (res.ok) {
        const data: AcademicYear[] = await res.json()
        setAcademicYears(data)
        
        const session = getAuthSession()
        if (session && session.role !== 'admin' && session.academicYear) {
          setSelectedYearState(session.academicYear)
          return
        }

        const stored = localStorage.getItem(STORAGE_KEY)
        const activeEntry = data.find(y => y.status === 'ACTIVE')
        const yearStrings = data.map(y => y.academic_year)

        if (stored && yearStrings.includes(stored)) {
          setSelectedYearState(stored)
        } else if (activeEntry) {
          try { localStorage.setItem(STORAGE_KEY, activeEntry.academic_year) } catch {}
          setSelectedYearState(activeEntry.academic_year)
        } else {
          // If selected year is not in the list, default to first available
          if (!yearStrings.includes(selectedYear) && data.length > 0) {
            setSelectedYearState(data[0].academic_year)
            try { localStorage.setItem(STORAGE_KEY, data[0].academic_year) } catch {}
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch academic years:', err)
      // No fallback if API fails to prevent showing fake data
      setAcademicYears([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedYear])

  useEffect(() => {
    fetchYears()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activeYear = academicYears.find(y => y.status === 'ACTIVE')?.academic_year ?? getDefaultAcademicYear()

  const setSelectedYear = (year: string) => {
    const normalized = normalizeAcademicYear(year)
    if (isValidAcademicYear(normalized)) {
      setSelectedYearState(normalized)
      try {
        localStorage.setItem(STORAGE_KEY, normalized)
      } catch {}
    }
  }

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      const normalized = normalizeAcademicYear(e.newValue)
      if (isValidAcademicYear(normalized)) {
        setSelectedYearState(normalized)
      }
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  return (
    <AcademicYearContext.Provider value={{
      selectedYear,
      setSelectedYear,
      academicYears,
      activeYear,
      isLoading,
      refetchYears: fetchYears
    }}>
      {children}
    </AcademicYearContext.Provider>
  )
}

export function useAcademicYear() {
  const context = useContext(AcademicYearContext)
  return context || {
    selectedYear: getDefaultAcademicYear(),
    setSelectedYear: () => {},
    academicYears: [],
    activeYear: getDefaultAcademicYear(),
    isLoading: false,
    refetchYears: async () => {}
  }
}

/** For backward-compat: derive a sorted options array from the context's academic years */
export function useAcademicYearOptions(): string[] {
  const { academicYears } = useAcademicYear()
  if (academicYears.length === 0) return []
  return [...academicYears].sort((a, b) => b.academic_year.localeCompare(a.academic_year)).map(y => y.academic_year)
}
