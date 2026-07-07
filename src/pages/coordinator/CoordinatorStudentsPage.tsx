import { useState, useMemo } from 'react'
import { Search, GraduationCap } from 'lucide-react'
import { getAuthSession } from '../../lib/auth'
import { loadMasterRows, loadPlacements, useStoreState } from '../../lib/placeproStore'
import { matchesBranch, getShortBranchName } from '../../lib/branchUtils'

export function CoordinatorStudentsPage() {
  const session = getAuthSession()
  const coordDept = session?.department || 'Computer Science Engineering'

  const masterRows = useStoreState(loadMasterRows) ?? []
  const placements = useStoreState(loadPlacements) ?? []

  const [search, setSearch] = useState('')

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
            onChange={(event) => setSearch(event.target.value)}
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
                  </tr>
                )
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
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
    </>
  )
}
