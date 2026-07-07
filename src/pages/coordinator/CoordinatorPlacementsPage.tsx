import { useState, useMemo } from 'react'
import { Briefcase, Search } from 'lucide-react'
import { getAuthSession } from '../../lib/auth'
import { loadPlacements, loadMasterRows, useStoreState } from '../../lib/placeproStore'
import { matchesBranch, getShortBranchName } from '../../lib/branchUtils'

export function CoordinatorPlacementsPage() {
  const session = getAuthSession()
  const coordDept = session?.department || 'Computer Science Engineering'

  const placements = useStoreState(loadPlacements) ?? []
  const masterRows = useStoreState(loadMasterRows) ?? []

  const [search, setSearch] = useState('')

  // Filter department placements
  const branchPlacements = useMemo(() => {
    return placements.filter((p) => {
      const inMaster = masterRows.some(
        (mr) => mr.rollNumber.trim().toUpperCase() === p.id.trim().toUpperCase() && matchesBranch(mr.branch, coordDept)
      )
      return inMaster || matchesBranch(p.branch, coordDept)
    })
  }, [placements, masterRows, coordDept])

  // Search filter
  const filteredPlacements = useMemo(() => {
    return branchPlacements.filter((p) => {
      return (
        p.student.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.company.toLowerCase().includes(search.toLowerCase()) ||
        p.role.toLowerCase().includes(search.toLowerCase())
      )
    })
  }, [branchPlacements, search])

  // Placement analytics specifically for this branch
  const metrics = useMemo(() => {
    let maxPkg = 0
    let totalPkg = 0
    let validPkgCount = 0

    branchPlacements.forEach((p) => {
      // Parse packages like "₹ 12.5 LPA" or "12.5 LPA" -> 12.5
      const matches = p.package.match(/([0-9.]+)/)
      if (matches && matches[1]) {
        const val = parseFloat(matches[1])
        if (!isNaN(val)) {
          if (val > maxPkg) maxPkg = val
          totalPkg += val
          validPkgCount++
        }
      }
    })

    const avg = validPkgCount > 0 ? (totalPkg / validPkgCount).toFixed(2) : '0.00'
    return {
      highest: maxPkg > 0 ? `₹ ${maxPkg.toFixed(2)} LPA` : '-',
      avg: validPkgCount > 0 ? `₹ ${avg} LPA` : '-',
    }
  }, [branchPlacements])

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-primary" />
            {getShortBranchName(coordDept)} Placement Offers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track successful placement selections and offer details for {getShortBranchName(coordDept)}.
          </p>
        </div>
      </div>

      {/* Placement Mini Summary */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="card-surface p-4 text-center">
          <div className="text-2xl font-extrabold text-primary">{branchPlacements.length}</div>
          <div className="text-xs text-muted-foreground font-semibold mt-1">Total Offers Received</div>
        </div>
        <div className="card-surface p-4 text-center">
          <div className="text-2xl font-extrabold text-success">{metrics.highest}</div>
          <div className="text-xs text-muted-foreground font-semibold mt-1">Highest Package</div>
        </div>
        <div className="card-surface p-4 text-center">
          <div className="text-2xl font-extrabold text-indigo-600">{metrics.avg}</div>
          <div className="text-xs text-muted-foreground font-semibold mt-1">Average Package</div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search offers by company, student, roll number, or role..."
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
                <th className="px-5 py-3 font-medium">Student Name</th>
                <th className="px-5 py-3 font-medium">Roll Number</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Package</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlacements.map((p) => (
                <tr
                  key={p.id + '-' + p.company}
                  className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-5 py-3 font-semibold">{p.student}</td>
                  <td className="px-5 py-3 font-mono text-xs">{p.id}</td>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-foreground">{p.company}</div>
                  </td>
                  <td className="px-5 py-3">{p.role}</td>
                  <td className="px-5 py-3 font-mono font-bold text-success">{p.package}</td>
                  <td className="px-5 py-3 font-mono text-xs">{p.date}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        p.type === 'On-campus'
                          ? 'bg-blue-500/10 text-blue-600'
                          : 'bg-amber-500/10 text-amber-700'
                      }`}
                    >
                      {p.type}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredPlacements.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                    No matching placement offers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Showing {filteredPlacements.length} of {branchPlacements.length} offers
      </div>
    </>
  )
}
