import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GraduationCap, Search, Building2, Clock, X, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { getAuthSession } from '../../lib/auth'
import {
  loadCompanies,
  loadMasterRows,
  loadPlacementForms,
  loadFormSubmissions,
  useStoreState,
} from '../../lib/placeproStore'
import { matchesBranch, getShortBranchName } from '../../lib/branchUtils'

export function CoordinatorEligibilityPage() {
  const session = getAuthSession()
  const coordDept = session?.department || 'Computer Science Engineering'

  const companiesList = useStoreState(loadCompanies) ?? []
  const masterStudents = useStoreState(loadMasterRows) ?? []
  const publishedForms = useStoreState(loadPlacementForms) ?? []
  const submissions = useStoreState(loadFormSubmissions) ?? []

  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') || ''
  const [selectedDriveForModal, setSelectedDriveForModal] = useState<any | null>(null)
  const [modalTab, setModalTab] = useState<'eligible' | 'applied'>('eligible')

  // Filter department students
  const deptStudents = useMemo(() => {
    return masterStudents.filter((s) => matchesBranch(s.branch, coordDept))
  }, [masterStudents, coordDept])

  // Process drives with branch-level metrics
  const drivesData = useMemo(() => {
    return companiesList.map((company) => {
      // Find matching form
      const matchingForm = publishedForms.find((f) =>
        (f.companyName && f.companyName.toLowerCase() === company.name.toLowerCase()) ||
        f.name.toLowerCase().includes(company.name.toLowerCase())
      )

      // Parse minimum CGPA criteria and backlogs
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

      // Count eligible students in coordinator's branch
      const eligibleStudents = deptStudents.filter((s) => {
        const cgpaPass = minCgpa <= 0 || (parseFloat(s.btechCgpa) || 0) >= minCgpa
        const backlogsPass = maxBacklogsAllowed === -1 || (parseInt(s.noOfBacklogs || (s.activeBacklogs === 'Yes' ? '1' : '0')) || 0) <= maxBacklogsAllowed
        return cgpaPass && backlogsPass
      })

      // Count applied students in coordinator's branch
      const formId = matchingForm?.id || ''
      const appliedStudents = submissions.filter((s) => {
        const studentRecord = deptStudents.find(
          (ds) => ds.rollNumber.trim().toUpperCase() === s.roll.trim().toUpperCase()
        )
        return s.formId === formId && studentRecord !== undefined
      })

      return {
        ...company,
        minCgpa,
        eligibleCount: eligibleStudents.length,
        appliedCount: appliedStudents.length,
        deadline: matchingForm?.endDate || 'N/A',
        formId,
      }
    })
  }, [companiesList, publishedForms, submissions, deptStudents])

  // Search filter
  const filteredDrives = useMemo(() => {
    return drivesData.filter(
      (d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.sector.toLowerCase().includes(search.toLowerCase()) ||
        d.location.toLowerCase().includes(search.toLowerCase())
    )
  }, [drivesData, search])

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary" />
          {getShortBranchName(coordDept)} Drive Eligibility
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyze CGPA cutoffs and student registration submissions for active recruitment drives.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search drives by company name, sector, or location..."
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDrives.map((drive) => {
          const completionRate = drive.eligibleCount > 0
            ? Math.round((drive.appliedCount / drive.eligibleCount) * 100)
            : 0

          return (
            <div key={drive.id} className="card-surface p-5 flex flex-col justify-between card-hover">
              <div>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      drive.status === 'Active'
                        ? 'bg-success/10 text-success'
                        : drive.status === 'Completed'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-info/15 text-info-foreground'
                    }`}
                  >
                    {drive.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold leading-snug">{drive.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground font-medium">
                  {drive.jobType} · {drive.location}
                </p>

                <div className="mt-4 space-y-2 border-y border-border py-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min CGPA Cutoff:</span>
                    <span className="font-bold text-foreground">{drive.minCgpa.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch Eligible:</span>
                    <span className="font-semibold text-foreground">{drive.eligibleCount} students</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch Applied:</span>
                    <span className="font-semibold text-foreground">{drive.appliedCount} students</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">App Deadline:</span>
                    <span className="font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {drive.deadline}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Application Completion:</span>
                  <span className="text-primary">{completionRate}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDriveForModal(drive)
                    setModalTab('eligible')
                  }}
                  className="flex-1 h-9 items-center justify-center rounded-lg border border-input text-xs font-semibold hover:bg-muted text-center cursor-pointer"
                >
                  View Eligible
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDriveForModal(drive)
                    setModalTab('applied')
                  }}
                  className="flex-1 h-9 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-pop hover:opacity-95 text-center cursor-pointer"
                >
                  View Applied
                </button>
              </div>
            </div>
          )}
        )}
      </div>

      {filteredDrives.length === 0 && (
        <div className="card-surface p-12 text-center text-muted-foreground">
          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <div className="text-sm font-semibold">No placement drives found</div>
        </div>
      )}

      {/* Roster Detail Modal */}
      {selectedDriveForModal && (() => {
        const drive = selectedDriveForModal

        // Filter eligible students
        const modalEligibleStudents = deptStudents.filter(
          (s) => (parseFloat(s.btechCgpa) || 0) >= drive.minCgpa
        )

        // Filter applied students
        const modalAppliedStudents = submissions.filter((sub) => {
          const studentRecord = deptStudents.find(
            (ds) => ds.rollNumber.trim().toUpperCase() === sub.roll.trim().toUpperCase()
          )
          return sub.formId === drive.formId && studentRecord !== undefined
        })

        const studentsList = modalTab === 'eligible' ? modalEligibleStudents : modalAppliedStudents

        const handleDownloadModalExcel = () => {
          if (modalTab === 'eligible') {
            const exportData = modalEligibleStudents.map((s) => {
              const hasApplied = submissions.some(
                (sub) => sub.formId === drive.formId && sub.roll.trim().toUpperCase() === s.rollNumber.trim().toUpperCase()
              )
              return {
                'Roll Number': s.rollNumber,
                'Student Name': s.fullName || `${s.firstName} ${s.lastName}`.trim(),
                CGPA: s.btechCgpa,
                Backlogs: s.noOfBacklogs || s.activeBacklogs || '0',
                Email: s.mailId,
                Phone: s.phoneNumber,
                'Applied Status': hasApplied ? 'Applied' : 'Not Applied'
              }
            })
            const ws = XLSX.utils.json_to_sheet(exportData)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Eligible Students')
            XLSX.writeFile(wb, `${getShortBranchName(coordDept)}_${drive.name.replace(/\s+/g, '_')}_Eligible.xlsx`)
          } else {
            const exportData = modalAppliedStudents.map((sub) => {
              const mRow = deptStudents.find((ds) => ds.rollNumber.trim().toUpperCase() === sub.roll.trim().toUpperCase())
              return {
                'Roll Number': sub.roll,
                'Student Name': sub.name,
                CGPA: mRow?.btechCgpa || sub.values['CGPA'] || '-',
                Backlogs: mRow?.noOfBacklogs || mRow?.activeBacklogs || '0',
                Email: mRow?.mailId || '-',
                'Submitted At': sub.submittedAt
              }
            })
            const ws = XLSX.utils.json_to_sheet(exportData)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Applied Students')
            XLSX.writeFile(wb, `${getShortBranchName(coordDept)}_${drive.name.replace(/\s+/g, '_')}_Applied.xlsx`)
          }
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative max-h-[85vh] w-full max-w-4xl overflow-hidden card-surface flex flex-col shadow-pop animate-in zoom-in-95 duration-200 bg-background">
              {/* Header */}
              <div className="p-5 border-b border-border flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{drive.name} Details</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    Branch: {coordDept} · Cutoff CGPA: {drive.minCgpa.toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDriveForModal(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs & Actions */}
              <div className="px-5 py-3 bg-muted/20 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex gap-4 text-sm font-semibold">
                  <button
                    onClick={() => setModalTab('eligible')}
                    className={`pb-1 transition-colors relative cursor-pointer ${
                      modalTab === 'eligible' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Eligible Students ({modalEligibleStudents.length})
                    {modalTab === 'eligible' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
                  </button>
                  <button
                    onClick={() => setModalTab('applied')}
                    className={`pb-1 transition-colors relative cursor-pointer ${
                      modalTab === 'applied' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Applied Students ({modalAppliedStudents.length})
                    {modalTab === 'applied' && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadModalExcel}
                  disabled={studentsList.length === 0}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-pop hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Download {modalTab === 'eligible' ? 'Eligible' : 'Applied'} List (Excel)
                </button>
              </div>

              {/* Roster Table */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground sticky top-0 z-10">
                      <th className="px-5 py-3 font-medium">Roll Number</th>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">CGPA</th>
                      <th className="px-5 py-3 font-medium">Backlogs</th>
                      <th className="px-5 py-3 font-medium">Contact Details</th>
                      {modalTab === 'eligible' && <th className="px-5 py-3 font-medium">Application Status</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {modalTab === 'eligible' ? (
                      modalEligibleStudents.map((s) => {
                        const hasApplied = submissions.some(
                          (sub) => sub.formId === drive.formId && sub.roll.trim().toUpperCase() === s.rollNumber.trim().toUpperCase()
                        )
                        return (
                          <tr key={s.rollNumber} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="px-5 py-3 font-mono">{s.rollNumber}</td>
                            <td className="px-5 py-3 font-bold">{s.fullName || `${s.firstName} ${s.lastName}`.trim()}</td>
                            <td className="px-5 py-3 font-mono">{s.btechCgpa}</td>
                            <td className="px-5 py-3 font-mono">{s.noOfBacklogs || s.activeBacklogs || '0'}</td>
                            <td className="px-5 py-3">
                              <div className="text-[10px] text-muted-foreground">{s.mailId}</div>
                              <div className="text-[9px] text-muted-foreground/80 mt-0.5">{s.phoneNumber}</div>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                hasApplied ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning-foreground'
                              }`}>
                                {hasApplied ? 'Applied' : 'Not Applied'}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      modalAppliedStudents.map((sub) => {
                        const mRow = deptStudents.find((ds) => ds.rollNumber.trim().toUpperCase() === sub.roll.trim().toUpperCase())
                        return (
                          <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="px-5 py-3 font-mono">{sub.roll}</td>
                            <td className="px-5 py-3 font-bold">{sub.name}</td>
                            <td className="px-5 py-3 font-mono">{mRow?.btechCgpa || sub.values['CGPA'] || '-'}</td>
                            <td className="px-5 py-3 font-mono">{mRow?.noOfBacklogs || mRow?.activeBacklogs || '0'}</td>
                            <td className="px-5 py-3 text-[10px] text-muted-foreground">{mRow?.mailId || '-'}</td>
                          </tr>
                        )
                      })
                    )}
                    {studentsList.length === 0 && (
                      <tr>
                        <td colSpan={modalTab === 'eligible' ? 6 : 5} className="px-5 py-12 text-center text-muted-foreground italic">
                          No students found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDriveForModal(null)}
                  className="h-9 rounded-lg border border-input px-4 text-xs font-semibold hover:bg-muted cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
