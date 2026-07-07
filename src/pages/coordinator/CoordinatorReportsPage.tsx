import { useState, useMemo } from 'react'
import { FileText, Download, Building2, Users, Briefcase } from 'lucide-react'
import * as XLSX from 'xlsx'
import { getAuthSession } from '../../lib/auth'
import {
  loadMasterRows,
  loadPlacements,
  loadCompanies,
  useStoreState,
} from '../../lib/placeproStore'
import { matchesBranch, getShortBranchName } from '../../lib/branchUtils'

export function CoordinatorReportsPage() {
  const session = getAuthSession()
  const coordDept = session?.department || 'Computer Science Engineering'

  const masterRows = useStoreState(loadMasterRows) ?? []
  const placements = useStoreState(loadPlacements) ?? []
  const companiesList = useStoreState(loadCompanies) ?? []

  const [selectedDriveId, setSelectedDriveId] = useState('')

  // Filter department students
  const deptStudents = useMemo(() => {
    return masterRows.filter((s) => matchesBranch(s.branch, coordDept))
  }, [masterRows, coordDept])

  // Deduplicate placed rolls
  const placedRolls = useMemo(() => {
    const set = new Set<string>()
    placements.forEach((p) => set.add(p.id.trim().toUpperCase()))
    return set
  }, [placements])

  // Filter department placements
  const deptPlacements = useMemo(() => {
    return placements.filter((p) => {
      const inMaster = masterRows.some(
        (mr) => mr.rollNumber.trim().toUpperCase() === p.id.trim().toUpperCase() && matchesBranch(mr.branch, coordDept)
      )
      return inMaster || matchesBranch(p.branch, coordDept)
    })
  }, [placements, masterRows, coordDept])

  // Export helper
  const exportToExcel = (data: any[], filename: string, sheetName: string) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  // Action 1: Export all students
  const handleExportStudents = () => {
    const exportData = deptStudents.map((s) => ({
      'Roll Number': s.rollNumber,
      'Full Name': s.fullName || `${s.firstName} ${s.lastName}`.trim(),
      Branch: s.branch,
      CGPA: s.btechCgpa,
      Backlogs: s.noOfBacklogs || s.activeBacklogs || '0',
      'Email Address': s.mailId,
      'Phone Number': s.phoneNumber,
      Gender: s.gender,
      'Placement Status': placedRolls.has(s.rollNumber.trim().toUpperCase()) ? 'Placed' : 'Unplaced',
    }))
    exportToExcel(
      exportData,
      `${getShortBranchName(coordDept)}_Student_Directory_${new Date().toISOString().split('T')[0]}`,
      'Students'
    )
  }

  // Action 2: Export placements
  const handleExportPlacements = () => {
    const exportData = deptPlacements.map((p) => ({
      'Roll Number': p.id,
      'Student Name': p.student,
      Company: p.company,
      Role: p.role,
      Package: p.package,
      Type: p.type,
      'Selection Date': p.date,
    }))
    exportToExcel(
      exportData,
      `${getShortBranchName(coordDept)}_Placement_Offers_${new Date().toISOString().split('T')[0]}`,
      'Offers'
    )
  }

  // Action 3: Export drive eligibility
  const handleExportDriveEligibility = () => {
    const drive = companiesList.find((c) => c.id === selectedDriveId)
    if (!drive) return

    // Parse minimum CGPA criteria
    let minCgpa = 6.0
    if (drive.remarks && drive.remarks.includes('CGPA')) {
      const matches = drive.remarks.match(/CGPA\s*(?:>=|>|of)?\s*([0-9.]+)/i)
      if (matches && matches[1]) minCgpa = parseFloat(matches[1])
    }

    // Filter students meeting CGPA
    const eligibleStudents = deptStudents.filter(
      (s) => (parseFloat(s.btechCgpa) || 0) >= minCgpa
    )

    const exportData = eligibleStudents.map((s) => ({
      'Roll Number': s.rollNumber,
      'Full Name': s.fullName || `${s.firstName} ${s.lastName}`.trim(),
      CGPA: s.btechCgpa,
      'Active Backlogs': s.noOfBacklogs || s.activeBacklogs || '0',
      'Email Address': s.mailId,
      'Phone Number': s.phoneNumber,
    }))

    exportToExcel(
      exportData,
      `${getShortBranchName(coordDept)}_Eligible_Students_${drive.name.replace(/\s+/g, '_')}`,
      'Eligible Students'
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" />
          {getShortBranchName(coordDept)} Placement Reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Export branch statistics and data records directly into Excel spreadsheets.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Students Directory */}
        <div className="card-surface p-5 flex flex-col justify-between card-hover">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Student Directory</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Export the full roster of {getShortBranchName(coordDept)} student profiles including CGPA, backlogs, contact details, and placement status.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportStudents}
            className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export Student Directory
          </button>
        </div>

        {/* Card 2: Placement Offers */}
        <div className="card-surface p-5 flex flex-col justify-between card-hover">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success">
              <Briefcase className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Selections & Offers</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Export all placement selections, packages, roles, and hiring dates achieved by students in the {getShortBranchName(coordDept)} department.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportPlacements}
            className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-success text-sm font-semibold text-white shadow-pop hover:opacity-95 cursor-pointer animate-none"
          >
            <Download className="h-4 w-4" /> Export Placed List
          </button>
        </div>

        {/* Card 3: Eligibility Rosters */}
        <div className="card-surface p-5 flex flex-col justify-between card-hover">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Drive Eligibility List</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Select an active drive to filter and export students meeting that company's specific CGPA cutoff criteria.
            </p>

            <select
              value={selectedDriveId}
              onChange={(e) => setSelectedDriveId(e.target.value)}
              className="mt-4 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2"
            >
              <option value="">Select a Company Drive...</option>
              {companiesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.jobType})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!selectedDriveId}
            onClick={handleExportDriveEligibility}
            className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-sm font-semibold text-white shadow-pop hover:opacity-95 disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export Eligible List
          </button>
        </div>
      </div>
    </>
  )
}
