import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, GraduationCap, ArrowRight, Eye, BookOpen, Award } from 'lucide-react'
import {
  studentDrives,
  studentProfile,
} from '../../data/platformData'
import { loadPlacements, loadMasterRows, loadPlacementNotifications, useStoreState } from '../../lib/placeproStore'
import { getAuthSession } from '../../lib/auth'
import { careerRoles } from '../../data/careerData'

const appliedCount = studentDrives.filter((drive) => drive.status === 'Applied').length
const eligibleCount = studentDrives.filter((drive) => drive.status === 'Eligible').length

export function StudentHomePage() {
  const session = getAuthSession()
  const masterStudents = useStoreState(loadMasterRows) ?? []

  const selectedRoleId = useMemo(() => localStorage.getItem('career_hub_selected_role') || 'frontend', [])
  const progress = useMemo(() => {
    try {
      const raw = localStorage.getItem('career_hub_progress')
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  }, [])
  const role = useMemo(() => careerRoles.find(r => r.id === selectedRoleId) || careerRoles[0], [selectedRoleId])
  const completedSkills = useMemo(() => progress[role.id] || [], [progress, role])
  const pct = useMemo(() => Math.round((completedSkills.length / role.skills.length) * 100), [completedSkills, role])

  const currentRollNumber = useMemo(() => {
    if (session?.rollNumber) return session.rollNumber
    if (session?.email) {
      const found = masterStudents.find(
        (s) => s.mailId.toLowerCase() === session.email.toLowerCase()
      )
      if (found) return found.rollNumber
    }
    return studentProfile.rollNumber
  }, [session, masterStudents])

  const placements = useStoreState(loadPlacements) ?? []
  const studentPlacement = useMemo(() => {
    return placements.find(
      (p) => p.id.trim().toUpperCase() === currentRollNumber.trim().toUpperCase()
    )
  }, [placements, currentRollNumber])

  const currentStudentName = useMemo(() => {
    if (studentPlacement) return studentPlacement.student
    if (session?.name) return session.name
    return studentProfile.fullName
  }, [studentPlacement, session])

  const allNotifications = useStoreState(loadPlacementNotifications) ?? []
  const placementNotifs = useMemo(() => {
    try {
      const cleanRoll = currentRollNumber.trim().toUpperCase()
      return allNotifications.filter((n) => {
        const targetRoll = (n.rollNumber || '').trim().toUpperCase()
        return !targetRoll || targetRoll === 'ALL' || targetRoll === cleanRoll
      })
    } catch {
      return []
    }
  }, [allNotifications, currentRollNumber])

  const mergedNotifications = useMemo(() => {
    return placementNotifs.map((n) => {
      const typeStr = n.type || ''
      const isCustomBroadcast = ['info', 'warning', 'success', 'announcement', 'Broadcast'].includes(typeStr) || !typeStr
      return {
        id: n.id,
        title: isCustomBroadcast ? (n.company || 'Announcement') : `🎉 Selected at ${n.company || 'Company'}`,
        time: 'New',
      }
    })
  }, [placementNotifs])

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Hello, {currentStudentName.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track registration, eligibility, drives, and your placement updates in one place.
        </p>
      </div>

      {studentPlacement && (
        <div className="mb-6 card-surface bg-gradient-to-br from-success/5 to-success/15 border-success/30 p-5 md:p-6 shadow-pop relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-success/10 rounded-full blur-xl animate-pulse" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success-foreground mb-3 uppercase tracking-wider">
                <Sparkles className="h-3 w-3 text-success animate-spin" style={{ animationDuration: '3s' }} /> Placed & Selected
              </span>
              <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                Congratulations, {studentPlacement.student}!
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You have received an offer from <span className="font-bold text-foreground">{studentPlacement.company}</span>.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg bg-background px-3 py-2 text-xs font-bold border border-border shadow-sm">
                Package: <span className="text-success font-extrabold">{studentPlacement.package}</span>
              </span>
              <span className="rounded-lg bg-background px-3 py-2 text-xs font-semibold border border-border shadow-sm">
                Role: <span className="text-foreground font-bold">{studentPlacement.role}</span>
              </span>
            </div>
          </div>

          <div className="mt-6 border-t border-success/20 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Offer Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="block text-xs text-muted-foreground uppercase font-semibold">Student</span>
                <span className="font-bold text-foreground">{studentPlacement.student}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground uppercase font-semibold">ID</span>
                <span className="font-mono text-foreground">{studentPlacement.id}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground uppercase font-semibold">Branch</span>
                <span className="font-semibold text-foreground">{studentPlacement.branch}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground uppercase font-semibold">Company</span>
                <span className="font-bold text-foreground">{studentPlacement.company}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground uppercase font-semibold">Role</span>
                <span className="text-foreground">{studentPlacement.role}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground uppercase font-semibold">Package</span>
                <span className="font-bold text-success">{studentPlacement.package}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground uppercase font-semibold">Date</span>
                <span className="text-foreground">{studentPlacement.date}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground uppercase font-semibold">Type</span>
                <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{studentPlacement.type}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Student Details', value: 'Verified', badge: 'Active' },
          { label: 'Eligible Companies', value: eligibleCount.toString(), sub: 'Matching your branch criteria' },
          { label: 'Applied Drives', value: appliedCount.toString(), sub: 'Across active drives' },
        ].map((stat) => (
          <div key={stat.label} className="card-surface card-hover p-5">
            {stat.badge && (
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                {stat.badge}
              </span>
            )}
            <div className="mt-2 text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
            {stat.sub && <div className="mt-1 text-xs text-muted-foreground">{stat.sub}</div>}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="card-surface p-5 md:p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary animate-pulse" /> Career Learning Hub
            </h3>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              Active Path
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="text-4xl sm:text-5xl bg-muted/40 p-4 rounded-2xl border border-border">
              {role.icon}
            </div>
            <div className="flex-1 w-full">
              <h4 className="text-lg font-bold text-foreground">{role.title}</h4>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{role.description}</p>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-1.5">
                  <span>Syllabus Progress</span>
                  <span>{pct}% ({completedSkills.length} / {role.skills.length} skills)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${role.gradient} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  to="/student/career"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition shadow-sm shadow-primary/10"
                >
                  Continue Learning <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/student/career"
                  className="inline-flex items-center gap-2 rounded-xl border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/50 transition"
                >
                  <Eye className="h-4 w-4 text-muted-foreground" /> Preview Roadmap
                </Link>
              </div>
            </div>
          </div>

          {/* Recommended Project & Latest Certifications */}
          <div className="mt-6 pt-5 border-t border-border grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-4 bg-muted/20">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" /> Recommended Project
              </div>
              <h5 className="text-sm font-bold text-foreground">{role.projects[0]?.title || 'Starter Project'}</h5>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{role.projects[0]?.description || 'Build a baseline project to test your skills.'}</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-muted/20">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-amber-500" /> Latest Certifications
              </div>
              <h5 className="text-sm font-bold text-foreground">Verified by PlaceGO! AI</h5>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Complete roadmap nodes to unlock skill certificates on your dashboard.</p>
            </div>
          </div>
        </div>

        <div className="card-surface p-5 md:p-6">
          <h3 className="mb-4 font-semibold">Notifications</h3>
          <ul className="space-y-3">
            {mergedNotifications.slice(0, 3).map((notification) => (
              <li
                key={notification.id}
                className="border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="text-sm font-medium">{notification.title}</div>
                <div className="text-xs text-muted-foreground">{notification.time}</div>
              </li>
            ))}
            {mergedNotifications.length === 0 && (
              <li className="text-sm text-muted-foreground italic">No notifications</li>
            )}
          </ul>
        </div>
      </div>
    </>
  )
}
