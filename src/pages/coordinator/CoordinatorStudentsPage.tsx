import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, GraduationCap, Eye, X, Download, User, CheckCircle2, XCircle, Clock, AlertCircle, Building2, Briefcase, Award } from 'lucide-react'
import { getAuthSession } from '../../lib/auth'
import { loadMasterRows, loadPlacements, loadCompanies, loadFormSubmissions, loadPlacementForms, useStoreState } from '../../lib/placeproStore'
import type { MasterStudentRow } from '../../lib/placeproStore'
import { matchesBranch, getShortBranchName } from '../../lib/branchUtils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function CoordinatorStudentsPage() {
  const session = getAuthSession()
  const coordDept = session?.department || 'Computer Science Engineering'

  const masterRows = useStoreState(loadMasterRows) ?? []
  const placements = useStoreState(loadPlacements) ?? []
  const companiesList = useStoreState(loadCompanies) ?? []
  const allSubmissions = useStoreState(loadFormSubmissions) ?? []
  const formsList = useStoreState(loadPlacementForms) ?? []

  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') || ''

  const [viewingStudent, setViewingStudent] = useState<MasterStudentRow | null>(null)
  const [activeTab, setActiveTab] = useState<'selected' | 'eligibleApplied' | 'eligibleNotApplied' | 'appliedNotSelected'>('selected')

  // Map placements to set for quick placed lookups
  const placedRolls = useMemo(() => {
    const set = new Set<string>()
    placements.forEach((p) => set.add(p.id.trim().toUpperCase()))
    return set
  }, [placements])

  // Filter students by branch
  const branchStudents = useMemo(() => {
    return masterRows.filter((s) => matchesBranch(s.branch, coordDept))
  }, [masterRows, coordDept])

  // Search filter
  const filteredStudents = useMemo(() => {
    return branchStudents.filter((student) => {
      const name = student.fullName || `${student.firstName} ${student.lastName}`.trim()
      const matchSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        student.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
        student.mailId.toLowerCase().includes(search.toLowerCase()) ||
        student.phoneNumber.includes(search)
      return matchSearch
    })
  }, [branchStudents, search])

  // Compute placement categorization for viewingStudent
  const studentPlacementDetails = useMemo(() => {
    if (!viewingStudent) return null

    const studentRoll = viewingStudent.rollNumber.trim().toUpperCase()
    const studentCgpa = parseFloat(viewingStudent.btechCgpa) || 0
    const studentBacklogs = parseInt(viewingStudent.noOfBacklogs || (viewingStudent.activeBacklogs === 'Yes' ? '1' : '0'), 10) || 0

    // 1. Check all placements for this student
    const studentPlacements = placements.filter((p) => p.id.trim().toUpperCase() === studentRoll)
    const placedCompanyNames = new Set(studentPlacements.map((p) => p.company.trim().toLowerCase()))

    // 2. Check all forms applied by this student
    const appliedFormIds = new Set(
      allSubmissions
        .filter((sub) => sub.roll.trim().toUpperCase() === studentRoll)
        .map((sub) => sub.formId)
    )

    const appliedCompanyNames = new Set<string>()
    appliedFormIds.forEach((fId) => {
      const f = formsList.find((item) => item.id === fId)
      if (f && f.companyName) {
        appliedCompanyNames.add(f.companyName.trim().toLowerCase())
      }
    })
    placedCompanyNames.forEach((c) => appliedCompanyNames.add(c))

    const selectedList: Array<{ name: string; packageLpa: string; role: string; type: string }> = []
    const eligibleAppliedList: Array<{ name: string; packageLpa: string; sector: string; minCgpa: number }> = []
    const eligibleNotAppliedList: Array<{ name: string; packageLpa: string; sector: string; minCgpa: number; deadline: string }> = []
    const appliedNotSelectedList: Array<{ name: string; packageLpa: string; sector: string }> = []

    // Populate selected list from placements
    studentPlacements.forEach((p) => {
      selectedList.push({
        name: p.company,
        packageLpa: p.package || 'TBD',
        role: p.role || 'Associate / Trainee',
        type: p.type || 'On-campus',
      })
    })

    // Evaluate every company drive
    companiesList.forEach((company) => {
      const compNameClean = company.name.trim().toLowerCase()
      const isSelected = placedCompanyNames.has(compNameClean)

      const matchingForm = formsList.find(
        (f) =>
          (f as any).companyDriveId === company.id ||
          f.companyName?.trim().toLowerCase() === compNameClean ||
          f.name.toLowerCase().includes(compNameClean)
      )
      const isApplied = isSelected || (matchingForm && appliedFormIds.has(matchingForm.id)) || appliedCompanyNames.has(compNameClean)

      let minCgpa = 6.0
      const explicitCgpaStr = company.minCgpa || matchingForm?.companyMinCgpa || ''
      if (explicitCgpaStr && !Number.isNaN(parseFloat(explicitCgpaStr)) && parseFloat(explicitCgpaStr) > 0) {
        minCgpa = parseFloat(explicitCgpaStr)
      } else {
        const combinedRemarks = `${company.remarks || ''} ${matchingForm?.companyRemarks || ''}`
        const cgpaMatch = combinedRemarks.match(/cgpa(?:[\s:>=-]|of|min|minimum|req|required|cutoff|at least|or above|for|to|apply|is)*([0-9.]+)/i)
        if (cgpaMatch && cgpaMatch[1] && !Number.isNaN(parseFloat(cgpaMatch[1])) && parseFloat(cgpaMatch[1]) > 0) {
          minCgpa = parseFloat(cgpaMatch[1])
        }
      }

      let maxBacklogsAllowed = -1
      const explicitBacklogsStr = company.maxBacklogs || matchingForm?.companyMaxBacklogs || ''
      if (explicitBacklogsStr && explicitBacklogsStr !== 'No Limit' && !Number.isNaN(parseInt(explicitBacklogsStr))) {
        maxBacklogsAllowed = parseInt(explicitBacklogsStr)
      } else if (explicitBacklogsStr === 'No Limit') {
        maxBacklogsAllowed = -1
      } else {
        const combinedRemarks = `${company.remarks || ''} ${matchingForm?.companyRemarks || ''}`
        if (combinedRemarks.toLowerCase().includes('backlog')) {
          const matches = combinedRemarks.match(/(?:max|maximum|at most|upto|up to|no more than|allow|allowed|req|required|min|minimum)?[\s:=]*(\d+)[\s:=]*(?:active\s*)?backlog/i)
          if (matches && matches[1]) {
            maxBacklogsAllowed = parseInt(matches[1])
          } else if (combinedRemarks.toLowerCase().includes('no backlogs') || combinedRemarks.toLowerCase().includes('0 backlog') || combinedRemarks.toLowerCase().includes('zero backlog')) {
            maxBacklogsAllowed = 0
          } else {
            const postMatches = combinedRemarks.match(/backlog[s]?(?:[\s:<=>-]|of|max|maximum|at most|allow|allowed|req|required|min|minimum|to|apply|is)*(\d+)/i)
            if (postMatches && postMatches[1]) {
              maxBacklogsAllowed = parseInt(postMatches[1])
            }
          }
        }
      }

      const isEligible = (minCgpa <= 0 || studentCgpa >= minCgpa) && (maxBacklogsAllowed === -1 || studentBacklogs <= maxBacklogsAllowed)

      if (isEligible && isApplied) {
        eligibleAppliedList.push({
          name: company.name,
          packageLpa: company.package || 'TBD',
          sector: company.sector || 'IT / Core',
          minCgpa,
        })
      } else if (isEligible && !isApplied) {
        eligibleNotAppliedList.push({
          name: company.name,
          packageLpa: company.package || 'TBD',
          sector: company.sector || 'IT / Core',
          minCgpa,
          deadline: company.status || 'Active',
        })
      }

      if (isApplied && !isSelected) {
        appliedNotSelectedList.push({
          name: company.name,
          packageLpa: company.package || 'TBD',
          sector: company.sector || 'IT / Core',
        })
      }
    })

    return {
      selectedList,
      eligibleAppliedList,
      eligibleNotAppliedList,
      appliedNotSelectedList,
    }
  }, [viewingStudent, placements, allSubmissions, formsList, companiesList])

  function handleExtractStudentReport() {
    if (!viewingStudent || !studentPlacementDetails) return

    const doc = new jsPDF()

    const sName = viewingStudent.fullName || `${viewingStudent.firstName} ${viewingStudent.lastName}`.trim()
    const sRoll = viewingStudent.rollNumber.trim().toUpperCase()

    // Header / Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`PlaceGO! - Student Profile & Placements Report`, 14, 18)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Roll Number: ${sRoll}  |  Name: ${sName}`, 14, 26)
    doc.text(`Branch: ${viewingStudent.branch || coordDept}  |  Generated on: ${new Date().toLocaleDateString()}`, 14, 32)

    // Academic Details Table
    const academicHeaders = [['Academic & Personal Field', 'Record Details']]
    const academicRows = [
      ['Roll Number', sRoll],
      ['Full Name', sName],
      ['Email Address', viewingStudent.mailId || 'N/A'],
      ['Phone Number', viewingStudent.phoneNumber || 'N/A'],
      ['Gender & DOB', `${viewingStudent.gender || 'N/A'} | ${viewingStudent.dateOfBirth || 'N/A'}`],
      ['Branch & Section', `${viewingStudent.branch || 'N/A'} (${(viewingStudent as any).section || 'N/A'})`],
      ['B.Tech CGPA', `${viewingStudent.btechCgpa || '0.00'}`],
      ['Active Backlogs', `${viewingStudent.noOfBacklogs || (viewingStudent.activeBacklogs === 'Yes' ? '1' : '0')}`],
      ['History of Backlogs', `${(viewingStudent as any).historyBacklogs || '0'}`],
      ['10th Percentage / YOP', `${viewingStudent.tenthPercentage || 'N/A'}% (${viewingStudent.tenthYop || 'N/A'})`],
      ['12th / Diploma % / YOP', `${viewingStudent.twelfthPercentage || 'N/A'}% (${viewingStudent.twelfthYop || 'N/A'})`],
      ['Placement Status', studentPlacementDetails.selectedList.length > 0 ? `Placed\n${studentPlacementDetails.selectedList.map((s) => `• ${s.name}`).join('\n')}` : 'Unplaced'],
    ]

    // @ts-ignore
    autoTable(doc, {
      head: academicHeaders,
      body: academicRows,
      startY: 38,
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65 } },
      margin: { left: 14, right: 14 },
    })

    let currentY = (doc as any).lastAutoTable.finalY + 12

    // 1. Selected Companies Table
    if (currentY > 250) { doc.addPage(); currentY = 20 }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`1. Selected / Placed Companies (${studentPlacementDetails.selectedList.length})`, 14, currentY)
    
    // @ts-ignore
    autoTable(doc, {
      head: [['Company Name', 'Role Offered', 'Package (LPA)', 'Offer Type']],
      body: studentPlacementDetails.selectedList.map((c) => [c.name, c.role, c.packageLpa.replace(/₹/g, 'Rs.'), c.type]),
      startY: currentY + 4,
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
    })
    currentY = (doc as any).lastAutoTable.finalY + 12

    // 2. Eligible Applied Companies Table
    if (currentY > 250) { doc.addPage(); currentY = 20 }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`2. Eligible Applied Companies (${studentPlacementDetails.eligibleAppliedList.length})`, 14, currentY)
    
    // @ts-ignore
    autoTable(doc, {
      head: [['Company Name', 'Package (LPA)', 'Sector / Category', 'Min CGPA Cutoff']],
      body: studentPlacementDetails.eligibleAppliedList.map((c) => [c.name, c.packageLpa.replace(/₹/g, 'Rs.'), c.sector, c.minCgpa <= 0 ? 'No Cutoff' : c.minCgpa.toFixed(2)]),
      startY: currentY + 4,
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
    })
    currentY = (doc as any).lastAutoTable.finalY + 12

    // 3. Eligible Not Applied Companies Table
    if (currentY > 250) { doc.addPage(); currentY = 20 }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`3. Eligible Not Applied Companies (${studentPlacementDetails.eligibleNotAppliedList.length})`, 14, currentY)
    
    // @ts-ignore
    autoTable(doc, {
      head: [['Company Name', 'Package (LPA)', 'Sector / Category', 'Deadline']],
      body: studentPlacementDetails.eligibleNotAppliedList.map((c) => [c.name, c.packageLpa.replace(/₹/g, 'Rs.'), c.sector, c.deadline]),
      startY: currentY + 4,
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
    })
    currentY = (doc as any).lastAutoTable.finalY + 12

    // 4. Not Selected But Applied Companies Table
    if (currentY > 250) { doc.addPage(); currentY = 20 }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`4. Not Selected But Applied Companies (${studentPlacementDetails.appliedNotSelectedList.length})`, 14, currentY)
    
    // @ts-ignore
    autoTable(doc, {
      head: [['Company Name', 'Package (LPA)', 'Sector / Category']],
      body: studentPlacementDetails.appliedNotSelectedList.map((c) => [c.name, c.packageLpa.replace(/₹/g, 'Rs.'), c.sector]),
      startY: currentY + 4,
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
    })

    doc.save(`${sRoll}_Profile_Placements_Report.pdf`)
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            {getShortBranchName(coordDept)} Student Records
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registered final-year academic records for {coordDept} batch.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search by roll number, name, email, or phone..."
            value={search}
            onChange={(event) => {
              const val = event.target.value
              setSearchParams((prev) => {
                if (val) {
                  prev.set('q', val)
                } else {
                  prev.delete('q')
                }
                return prev
              })
            }}
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Roll Number</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email / Phone</th>
                <th className="px-5 py-3 font-medium">CGPA</th>
                <th className="px-5 py-3 font-medium">Backlogs</th>
                <th className="px-5 py-3 font-medium">Gender</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const rollClean = student.rollNumber.trim().toUpperCase()
                const isPlaced = placedRolls.has(rollClean)
                const name = student.fullName || `${student.firstName} ${student.lastName}`.trim()
                const backlogs = student.noOfBacklogs || student.activeBacklogs || '0'

                return (
                  <tr
                    key={student.rollNumber}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs">{student.rollNumber}</td>
                    <td className="px-5 py-3 font-semibold">{name}</td>
                    <td className="px-5 py-3">
                      <div className="text-xs">{student.mailId}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {student.phoneNumber}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono font-semibold">{student.btechCgpa}</td>
                    <td className="px-5 py-3 font-mono text-xs">{backlogs}</td>
                    <td className="px-5 py-3">{student.gender}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isPlaced
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/15 text-warning-foreground'
                        }`}
                      >
                        {isPlaced ? 'Placed' : 'Unplaced'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingStudent(student)
                          setActiveTab('selected')
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-all"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">
                    No matching student records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Showing {filteredStudents.length} of {branchStudents.length} {getShortBranchName(coordDept)} students
      </div>

      {/* Student Details & Placements Modal */}
      {viewingStudent && studentPlacementDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
                  {viewingStudent.fullName?.charAt(0) || viewingStudent.firstName?.charAt(0) || 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">
                      {viewingStudent.fullName || `${viewingStudent.firstName} ${viewingStudent.lastName}`.trim()}
                    </h2>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {viewingStudent.rollNumber}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {viewingStudent.branch || coordDept} &bull; {viewingStudent.mailId || 'No email provided'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExtractStudentReport}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
                >
                  <Download className="h-4 w-4" /> Extract PDF Report
                </button>
                <button
                  type="button"
                  onClick={() => setViewingStudent(null)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Master Data Summary Grid */}
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> Master Data & Academic Record
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 rounded-xl border border-border bg-muted/20 p-4">
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">Email Address</div>
                  <div className="text-xs font-semibold truncate mt-0.5" title={viewingStudent.mailId}>{viewingStudent.mailId || '-'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">Phone Number</div>
                  <div className="text-xs font-semibold mt-0.5">{viewingStudent.phoneNumber || '-'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">Gender & DOB</div>
                  <div className="text-xs font-semibold mt-0.5">{viewingStudent.gender || '-'} &bull; {viewingStudent.dateOfBirth || '-'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">Branch & Section</div>
                  <div className="text-xs font-semibold mt-0.5">{viewingStudent.branch || coordDept} ({(viewingStudent as any).section || '-'})</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">B.Tech CGPA</div>
                  <div className="text-xs font-bold text-primary font-mono mt-0.5">{viewingStudent.btechCgpa || '0.00'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">Active Backlogs</div>
                  <div className="text-xs font-semibold font-mono mt-0.5">{viewingStudent.noOfBacklogs || (viewingStudent.activeBacklogs === 'Yes' ? '1' : '0')}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">History Backlogs</div>
                  <div className="text-xs font-semibold font-mono mt-0.5">{(viewingStudent as any).historyBacklogs || '0'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">10th Score / YOP</div>
                  <div className="text-xs font-semibold mt-0.5">{viewingStudent.tenthPercentage || '-'}% ({viewingStudent.tenthYop || '-'})</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">12th / Diploma / YOP</div>
                  <div className="text-xs font-semibold mt-0.5">{viewingStudent.twelfthPercentage || '-'}% ({viewingStudent.twelfthYop || '-'})</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">Academic Year</div>
                  <div className="text-xs font-semibold mt-0.5">{viewingStudent.academicYear || (session as any)?.academicYear || '2024-25'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[11px] text-muted-foreground font-medium">Overall Status</div>
                  <div className="mt-0.5">
                    {studentPlacementDetails.selectedList.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
                        <CheckCircle2 className="h-3 w-3" /> Placed ({studentPlacementDetails.selectedList.length} Offer{studentPlacementDetails.selectedList.length > 1 ? 's' : ''})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-bold text-warning-foreground">
                        <Clock className="h-3 w-3" /> Unplaced
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Placements Details Categorized Navigation Tabs */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-primary" /> Placement Drive Activity Breakdown
              </h3>
              
              <div className="flex flex-wrap border-b border-border gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('selected')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
                    activeTab === 'selected'
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Award className="h-3.5 w-3.5 text-emerald-500" /> Selected Companies ({studentPlacementDetails.selectedList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('eligibleApplied')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
                    activeTab === 'eligibleApplied'
                      ? 'border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Eligible Applied ({studentPlacementDetails.eligibleAppliedList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('eligibleNotApplied')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
                    activeTab === 'eligibleNotApplied'
                      ? 'border-amber-500 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Eligible Not Applied ({studentPlacementDetails.eligibleNotAppliedList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('appliedNotSelected')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
                    activeTab === 'appliedNotSelected'
                      ? 'border-slate-500 text-slate-600 bg-slate-50/50 dark:bg-slate-900/20'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <XCircle className="h-3.5 w-3.5 text-slate-400" /> Applied Not Selected ({studentPlacementDetails.appliedNotSelectedList.length})
                </button>
              </div>

              {/* Tab Contents */}
              <div className="mt-4">
                {activeTab === 'selected' && (
                  <div>
                    {studentPlacementDetails.selectedList.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        No selection / placement offers registered for this student yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {studentPlacementDetails.selectedList.map((comp, idx) => (
                          <div key={idx} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start justify-between">
                            <div>
                              <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <Building2 className="h-4 w-4 text-emerald-500" /> {comp.name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 font-medium">Role: {comp.role}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">Type: {comp.type}</div>
                            </div>
                            <div className="text-right">
                              <span className="inline-block rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs px-2.5 py-1">
                                {comp.packageLpa}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'eligibleApplied' && (
                  <div>
                    {studentPlacementDetails.eligibleAppliedList.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        No eligible applied company drives recorded.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {studentPlacementDetails.eligibleAppliedList.map((comp, idx) => (
                          <div key={idx} className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-start justify-between">
                            <div>
                              <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <Building2 className="h-4 w-4 text-blue-500" /> {comp.name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">Sector: {comp.sector}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">Min CGPA Required: {comp.minCgpa <= 0 ? 'No Cutoff' : comp.minCgpa.toFixed(2)}</div>
                            </div>
                            <div className="text-right">
                              <span className="inline-block rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold font-mono text-xs px-2.5 py-1">
                                {comp.packageLpa}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'eligibleNotApplied' && (
                  <div>
                    {studentPlacementDetails.eligibleNotAppliedList.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        Student applied to all companies where they met eligibility criteria.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {studentPlacementDetails.eligibleNotAppliedList.map((comp, idx) => (
                          <div key={idx} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start justify-between">
                            <div>
                              <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <Building2 className="h-4 w-4 text-amber-500" /> {comp.name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">Sector: {comp.sector}</div>
                              <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">Deadline: {comp.deadline}</div>
                            </div>
                            <div className="text-right">
                              <span className="inline-block rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold font-mono text-xs px-2.5 py-1">
                                {comp.packageLpa}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'appliedNotSelected' && (
                  <div>
                    {studentPlacementDetails.appliedNotSelectedList.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        No unselected application attempts found.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {studentPlacementDetails.appliedNotSelectedList.map((comp, idx) => (
                          <div key={idx} className="rounded-xl border border-border bg-muted/20 p-4 flex items-start justify-between">
                            <div>
                              <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <Building2 className="h-4 w-4 text-muted-foreground" /> {comp.name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">Sector: {comp.sector}</div>
                              <span className="inline-block mt-1 text-[10px] font-semibold text-slate-500 bg-slate-200 dark:bg-slate-800 rounded px-1.5 py-0.5">
                                Not Shortlisted / Selected
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="inline-block rounded-md bg-muted text-muted-foreground font-bold font-mono text-xs px-2.5 py-1">
                                {comp.packageLpa}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex justify-end border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
