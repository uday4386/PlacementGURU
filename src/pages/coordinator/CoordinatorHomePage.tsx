import { useMemo } from 'react'
import {
  Building2,
  GraduationCap,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
} from 'lucide-react'
import { getAuthSession } from '../../lib/auth'
import {
  loadMasterRows,
  loadPlacements,
  loadCompanies,
  useStoreState,
} from '../../lib/placeproStore'
import { matchesBranch, getShortBranchName } from '../../lib/branchUtils'

export function CoordinatorHomePage() {
  const session = getAuthSession()
  const coordDept = session?.department || 'Computer Science Engineering'

  const masterRows = useStoreState(loadMasterRows) ?? []
  const placements = useStoreState(loadPlacements) ?? []
  const companies = useStoreState(loadCompanies) ?? []

  // Filter students belonging to this coordinator's department
  const deptStudents = useMemo(() => {
    return masterRows.filter((s) => matchesBranch(s.branch, coordDept))
  }, [masterRows, coordDept])

  // Filter placements for students in this department
  const deptPlacements = useMemo(() => {
    return placements.filter((p) => {
      // Find if student exists in master list or match by branch mapping
      const inMaster = masterRows.some(
        (mr) => mr.rollNumber.trim().toUpperCase() === p.id.trim().toUpperCase() && matchesBranch(mr.branch, coordDept)
      )
      return inMaster || matchesBranch(p.branch, coordDept)
    })
  }, [placements, masterRows, coordDept])

  // Placed students set to deduplicate
  const placedRolls = useMemo(() => {
    const set = new Set<string>()
    deptPlacements.forEach((p) => set.add(p.id.trim().toUpperCase()))
    return set
  }, [deptPlacements])

  const totalStudentsCount = deptStudents.length
  const placedStudentsCount = placedRolls.size
  const unplacedStudentsCount = Math.max(0, totalStudentsCount - placedStudentsCount)
  const placementRate = totalStudentsCount > 0 
    ? ((placedStudentsCount / totalStudentsCount) * 100).toFixed(1)
    : '0.0'

  const activeDrives = useMemo(() => {
    return companies.filter((c) => c.status === 'Active').length
  }, [companies])

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {getShortBranchName(coordDept)} Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time branch statistics, academic placement rates, and student database management.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Total Students Card */}
        <div className="card-surface p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalStudentsCount}</div>
              <div className="text-xs text-muted-foreground font-medium">Total {getShortBranchName(coordDept)} Students</div>
            </div>
          </div>
        </div>

        {/* Placed Students Card */}
        <div className="card-surface p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-success">{placedStudentsCount}</div>
              <div className="text-xs text-muted-foreground font-medium">Students Placed</div>
            </div>
          </div>
        </div>

        {/* Unplaced Students Card */}
        <div className="card-surface p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-destructive">{unplacedStudentsCount}</div>
              <div className="text-xs text-muted-foreground font-medium">Unplaced Students</div>
            </div>
          </div>
        </div>

        {/* Placement Rate Card */}
        <div className="card-surface p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{placementRate}%</div>
              <div className="text-xs text-muted-foreground font-medium">Placement Ratio</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 card-surface p-5">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Active Campus Drives
          </h2>
          <div className="divide-y divide-border">
            {companies.filter(c => c.status === 'Active').slice(0, 5).map((c) => (
              <div key={c.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                <div>
                  <h4 className="font-bold text-foreground">{c.name}</h4>
                  <p className="text-xs text-muted-foreground">{c.jobType} · {c.location}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-success">{c.package}</div>
                  <div className="text-[10px] text-muted-foreground">Mode: {c.mode}</div>
                </div>
              </div>
            ))}
            {activeDrives === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No active placement drives currently.
              </div>
            )}
          </div>
        </div>

        <div className="card-surface p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" /> Branch Overview
            </h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Department:</span>
                <span className="font-semibold text-foreground text-right">{coordDept}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Active Drives:</span>
                <span className="font-bold text-primary">{activeDrives}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Total Selections:</span>
                <span className="font-semibold">{deptPlacements.length} offers</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Year Batch:</span>
                <span className="font-mono text-muted-foreground">2025–26</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
