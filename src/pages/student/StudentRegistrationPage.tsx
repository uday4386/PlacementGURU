import { useMemo } from 'react'
import { getAuthSession } from '../../lib/auth'
import { loadMasterRows, useStoreState } from '../../lib/placeproStore'
import { studentProfile } from '../../data/platformData'

export function StudentRegistrationPage() {
  const session = getAuthSession()
  const currentRoll = session?.rollNumber || ''

  // Find current student in master rows
  const masterStudents = useStoreState(loadMasterRows) ?? []
  const currentMasterRow = masterStudents.find(
    (s) => s.rollNumber.trim().toUpperCase() === currentRoll.trim().toUpperCase()
  )

  const profile = useMemo(() => {
    if (currentMasterRow) {
      return {
        fullName: currentMasterRow.fullName || `${currentMasterRow.firstName} ${currentMasterRow.lastName}`.trim(),
        rollNumber: currentMasterRow.rollNumber,
        department: currentMasterRow.branch,
        email: currentMasterRow.mailId,
        alternateEmail: currentMasterRow.alternateMailId || '-',
        phone: currentMasterRow.phoneNumber || '-',
        cgpa: currentMasterRow.btechCgpa || '-',
        tenthPercentage: currentMasterRow.tenthPercentage || '-',
        twelfthPercentage: currentMasterRow.twelfthPercentage || '-',
        activeBacklogs: currentMasterRow.noOfBacklogs || currentMasterRow.activeBacklogs || '0',
      }
    }
    return {
      fullName: studentProfile.fullName,
      rollNumber: studentProfile.rollNumber,
      department: studentProfile.department,
      email: studentProfile.email,
      alternateEmail: studentProfile.alternateEmail || '-',
      phone: studentProfile.phone || '-',
      cgpa: studentProfile.cgpa || '-',
      tenthPercentage: studentProfile.tenthPercentage || '-',
      twelfthPercentage: studentProfile.twelfthPercentage || '-',
      activeBacklogs: studentProfile.activeBacklogs || '0',
    }
  }, [currentMasterRow])

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Student Details</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Official student academic and contact details fetched from the college database.
        </p>
      </div>

      <div className="max-w-4xl mx-auto card-surface p-6 md:p-8 space-y-6">
        <h2 className="text-lg font-bold text-foreground border-b border-border pb-3">
          Academic and Personal Record
        </h2>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Full Name</label>
            <input
              type="text"
              value={profile.fullName}
              readOnly
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm outline-none font-medium text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Roll Number</label>
            <input
              type="text"
              value={profile.rollNumber}
              readOnly
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm outline-none font-mono text-foreground"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Department and Branch</label>
            <input
              type="text"
              value={profile.department}
              readOnly
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm outline-none font-medium text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Email Address</label>
            <input
              type="email"
              value={profile.email}
              readOnly
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm outline-none font-medium text-foreground"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Alternate Email</label>
            <input
              type="text"
              value={profile.alternateEmail}
              readOnly
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm outline-none font-medium text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Mobile Phone</label>
            <input
              type="text"
              value={profile.phone}
              readOnly
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm outline-none font-medium text-foreground"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-4 border-t border-border pt-6">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">B.Tech CGPA</label>
            <input
              type="text"
              value={profile.cgpa}
              readOnly
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm outline-none font-mono font-bold text-primary"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">10th %</label>
            <input
              type="text"
              value={profile.tenthPercentage}
              readOnly
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm outline-none font-mono text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">12th %</label>
            <input
              type="text"
              value={profile.twelfthPercentage}
              readOnly
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm outline-none font-mono text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Active Backlogs</label>
            <input
              type="text"
              value={profile.activeBacklogs}
              readOnly
              className="mt-1.5 h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm outline-none font-mono text-foreground"
            />
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-primary leading-relaxed font-semibold">
          💡 These details are locked and managed by the placement cell administrators. Contact the placement cell if there is an error in your record.
        </div>
      </div>
    </>
  )
}
