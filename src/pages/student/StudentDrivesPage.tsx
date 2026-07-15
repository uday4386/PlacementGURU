import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2,
  Calendar,
  CheckCircle2,
  Search,
  XCircle,
  X,
  MapPin,
  Briefcase,
  IndianRupee,
  GraduationCap,
  Clock,
  Info,
  AlertTriangle,
  Loader2,
  FileUp,
} from 'lucide-react'
import { getAuthSession } from '../../lib/auth'
import {
  loadCompanies,
  loadPlacementForms,
  loadFormSubmissions,
  submitSingleFormSubmission,
  loadMasterRows,
  loadPlacements,
  type FormSubmission,
  useStoreState,
} from '../../lib/placeproStore'

export function StudentDrivesPage() {
  const session = useMemo(() => getAuthSession(), [])
  const currentRoll = session?.rollNumber || ''

  // Load student CGPA to compute eligibility
  const students = useStoreState(loadMasterRows) ?? []
  const currentStudent = useMemo(() => {
    return students.find(s => s.rollNumber.trim().toUpperCase() === currentRoll.trim().toUpperCase())
  }, [currentRoll, students])
  const studentCgpa = useMemo(() => {
    return currentStudent ? parseFloat(currentStudent.btechCgpa) || 0.0 : 8.0 // default fallback
  }, [currentStudent])

  // Load dynamic companies from admin
  const companiesList = useStoreState(loadCompanies) ?? []

  // Load published forms
  const publishedForms = useStoreState(loadPlacementForms) ?? []

  // Load user submissions to set 'Applied' status
  const submissions = useStoreState(loadFormSubmissions) ?? []

  // Load user placement offers to set 'Selected' status
  const placements = useStoreState(loadPlacements) ?? []

  // Match companies/forms into student drives list
  const initialDrives = useMemo(() => {
    const drivesFromCompanies = companiesList.map((company) => {
      // Find matching form
      const matchingForm = publishedForms.find(f =>
        (f.companyName && f.companyName.toLowerCase() === company.name.toLowerCase()) ||
        (f.name.toLowerCase().includes(company.name.toLowerCase()))
      )

      // Find if student has submitted this form
      const formId = matchingForm?.id || company.id;
      const hasApplied = submissions.some(s => (s.formId === formId || s.formId === company.id) && s.roll.trim().toUpperCase() === currentRoll.trim().toUpperCase());

      // Check if student is selected/placed in this company
      const isSelected = placements.some((p) => {
        const rollMatch = p.id.trim().toUpperCase() === currentRoll.trim().toUpperCase()
        if (!rollMatch) return false
        const compMatch =
          p.company.trim().toLowerCase() === company.name.trim().toLowerCase() ||
          p.company.trim().toLowerCase().includes(company.name.trim().toLowerCase()) ||
          company.name.trim().toLowerCase().includes(p.company.trim().toLowerCase())
        return compMatch
      })

      // Determine eligibility based on GPA and backlogs
      let minCgpa = 6.0
      const explicitCgpaStr = company.minCgpa || matchingForm?.companyMinCgpa || ''
      if (explicitCgpaStr && !Number.isNaN(parseFloat(explicitCgpaStr)) && parseFloat(explicitCgpaStr) > 0) {
        minCgpa = parseFloat(explicitCgpaStr)
      } else {
        // Search remarks/text for CGPA patterns
        const combinedRemarks = `${company.remarks || ''} ${matchingForm?.companyRemarks || ''}`
        const cgpaMatch = combinedRemarks.match(/cgpa(?:[\s:>=-]|of|min|minimum|req|required|cutoff|at least|or above|for|to|apply|is)*([0-9.]+)/i)
        if (cgpaMatch && cgpaMatch[1] && !Number.isNaN(parseFloat(cgpaMatch[1])) && parseFloat(cgpaMatch[1]) > 0) {
          minCgpa = parseFloat(cgpaMatch[1])
        }
      }

      const isCgpaEligible = minCgpa <= 0 || studentCgpa >= minCgpa

      let isBacklogsEligible = true
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

      if (maxBacklogsAllowed !== -1) {
        const studentBacklogs = (currentStudent && (currentStudent.noOfBacklogs || (currentStudent.activeBacklogs === 'Yes' ? '1' : '0'))) || '0'
        const backlogsNum = parseInt(studentBacklogs) || 0
        if (backlogsNum > maxBacklogsAllowed) {
          isBacklogsEligible = false
        }
      }

      const maxBacklogsDisplay = maxBacklogsAllowed === -1
        ? 'No Limit'
        : maxBacklogsAllowed === 0
          ? '0 (No Active Backlogs)'
          : `At most ${maxBacklogsAllowed}`

      const isEligible = isCgpaEligible && isBacklogsEligible
      const driveIsClosed = company.status === 'Completed' || matchingForm?.status === 'Closed'
      const status: 'Selected' | 'Eligible' | 'Applied' | 'Not Eligible' | 'Closed' = isSelected
        ? 'Selected'
        : hasApplied
          ? 'Applied'
          : driveIsClosed
            ? 'Closed'
            : isEligible
              ? 'Eligible'
              : 'Not Eligible'

      const reasons: string[] = []
      if (!isCgpaEligible) reasons.push(`CGPA below ${minCgpa.toFixed(2)}`)
      if (!isBacklogsEligible) reasons.push(`Exceeds max backlogs (${maxBacklogsAllowed})`)
      const reason = !isEligible ? reasons.join(' & ') : undefined

      return {
        id: company.id,
        company: company.name,
        role: company.jobType + ' Specialist',
        packageLpa: company.package,
        minCgpa,
        maxBacklogsDisplay,
        deadline: matchingForm?.endDate || '2026-07-31',
        status,
        formId,
        reason,
        // Extra details for the modal
        sector: company.sector,
        type: company.type,
        location: company.location,
        mode: company.mode,
        jobType: company.jobType,
        academicYear: company.academicYear,
        remarks: company.remarks,
        hires: company.hires,
        drives: company.drives,
        driveStatus: company.status,
        startDate: matchingForm?.startDate,
        startTime: matchingForm?.startTime,
        endTime: matchingForm?.endTime,
      }
    })

    // General forms that are NOT matched to any company drive
    // Use the form's hasCompanyDrive flag first; fall back to name matching only for forms
    // that explicitly have a company drive association.
    const matchedFormIds = new Set(
      companiesList.flatMap((company) => {
        const matched = publishedForms.filter(f =>
          (f.companyName && f.companyName.toLowerCase() === company.name.toLowerCase()) ||
          (f.hasCompanyDrive && f.name.toLowerCase().includes(company.name.toLowerCase()))
        )
        return matched.map(f => f.id)
      })
    )

    const generalForms = publishedForms.filter(form => {
      // Exclude Draft forms from student view
      if (form.status === 'Draft') return false
      // Exclude forms already matched to a company drive
      if (matchedFormIds.has(form.id)) return false
      // Only exclude if it has a company drive AND was successfully matched to an existing company profile
      return true
    }).map(form => {
      const hasApplied = submissions.some(s => s.formId === form.id && s.roll.trim().toUpperCase() === currentRoll.trim().toUpperCase())
      const isSelected = placements.some((p) => {
        const rollMatch = p.id.trim().toUpperCase() === currentRoll.trim().toUpperCase()
        if (!rollMatch) return false
        return (
          p.company.trim().toLowerCase() === form.name.trim().toLowerCase() ||
          (form.companyName && p.company.trim().toLowerCase() === form.companyName.trim().toLowerCase())
        )
      })
      const driveIsClosed = form.status === 'Closed'
      const status: 'Selected' | 'Eligible' | 'Applied' | 'Not Eligible' | 'Closed' = isSelected
        ? 'Selected'
        : hasApplied
          ? 'Applied'
          : driveIsClosed
            ? 'Closed'
            : 'Eligible'
      return {
        id: form.id,
        company: form.name,
        role: form.type === 'Survey' ? 'SURVEY FORM' : `${form.type || 'General'} (SURVEY FORM)`,
        packageLpa: 'N/A',
        minCgpa: form.companyMinCgpa && !Number.isNaN(parseFloat(form.companyMinCgpa)) ? parseFloat(form.companyMinCgpa) : 0,
        maxBacklogsDisplay: form.companyMaxBacklogs ? form.companyMaxBacklogs : 'No Limit',
        deadline: form.endDate || '2026-07-31',
        status,
        formId: form.id,
        reason: undefined,
        sector: 'Survey / General',
        type: 'Survey Form',
        location: 'Campus',
        mode: 'Online',
        jobType: form.type || 'Survey Form',
        academicYear: form.academicYear || form.companyAcademicYear || '2025-2026',
        remarks: 'Official form published by placement cell.',
        hires: 0,
        drives: 0,
        driveStatus: form.status === 'Closed' ? 'Closed' : (form.status === 'Active' ? 'Active' : 'Draft'),
        startDate: form.startDate,
        startTime: form.startTime,
        endTime: form.endTime,
      }
    })

    return [...drivesFromCompanies, ...generalForms]
  }, [companiesList, publishedForms, submissions, currentRoll, studentCgpa, placements])

  const [drivesList, setDrivesList] = useState(initialDrives)

  useEffect(() => {
    setDrivesList(initialDrives)
  }, [initialDrives])

  const [filter, setFilter] = useState('All')
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') || ''

  // Modal states
  const [viewingDrive, setViewingDrive] = useState<typeof initialDrives[0] | null>(null)
  const [confirmApplyDrive, setConfirmApplyDrive] = useState<{ id: string; formId: string; company: string } | null>(null)

  // Auto-open drive details exactly once from query params (e.g. clicked from notifications page)
  useEffect(() => {
    const targetFormId = searchParams.get('formId')
    const targetCompany = searchParams.get('company')
    const targetDriveId = searchParams.get('driveId')

    if (targetFormId || targetDriveId || targetCompany) {
      const match = initialDrives.find((d) => {
        if (targetFormId && (d.formId === targetFormId || d.id === targetFormId)) return true
        if (targetDriveId && d.id === targetDriveId) return true
        if (targetCompany && (d.company.toLowerCase() === targetCompany.toLowerCase() || d.company.toLowerCase().includes(targetCompany.toLowerCase()))) return true
        return false
      })

      if (match && !viewingDrive && !confirmApplyDrive) {
        setViewingDrive(match)
        setSearchParams((prev) => {
          prev.delete('formId')
          prev.delete('company')
          prev.delete('driveId')
          prev.delete('action')
          return prev
        }, { replace: true })
      }
    }
  }, [searchParams, initialDrives, viewingDrive, confirmApplyDrive, setSearchParams])

  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [formUploads, setFormUploads] = useState<Record<string, boolean>>({})

  const selectedForm = useMemo(() => {
    if (!confirmApplyDrive) return null
    const found = confirmApplyDrive.formId
      ? publishedForms.find((f) => f.id === confirmApplyDrive.formId)
      : null
    if (found) return found

    return {
      id: confirmApplyDrive.formId || confirmApplyDrive.id,
      name: `Application Form: ${confirmApplyDrive.company}`,
      type: 'Company Drive Application',
      status: 'Open',
      created: new Date().toISOString(),
      total: 0,
      fields: [
        { id: 'roll', label: 'Roll Number', type: 'text' as const, required: true, placeholder: 'Enter your Roll Number' },
        { id: 'name', label: 'Student Name', type: 'text' as const, required: true, placeholder: 'Enter your Full Name' },
        { id: 'branch', label: 'Branch / Department', type: 'text' as const, required: true, placeholder: 'Enter your Branch' },
        { id: 'cgpa', label: 'B.Tech CGPA', type: 'number' as const, required: true, placeholder: 'Enter your CGPA' },
      ],
    }
  }, [confirmApplyDrive, publishedForms])

  useEffect(() => {
    if (confirmApplyDrive && selectedForm) {
      const initialValues: Record<string, string> = {}
      const match = students.find(s => (s.rollNumber || '').trim().toUpperCase() === currentRoll.trim().toUpperCase())
      selectedForm.fields.forEach((field) => {
        if (field.label.toLowerCase().includes('roll')) {
          initialValues[field.id] = currentRoll
        } else if (
          field.label.toLowerCase().includes('name') &&
          !field.label.toLowerCase().includes('father') &&
          !field.label.toLowerCase().includes('mother') &&
          !field.label.toLowerCase().includes('company')
        ) {
          initialValues[field.id] = session?.name || match?.fullName || ''
        } else if (field.label.toLowerCase().includes('branch') || field.label.toLowerCase().includes('dept')) {
          initialValues[field.id] = match?.branch || 'CSE'
        } else if (field.label.toLowerCase().includes('cgpa')) {
          initialValues[field.id] = match?.btechCgpa || ''
        } else {
          initialValues[field.id] = ''
        }
      })
      setFormValues(initialValues)
      setFormUploads({})
    }
  }, [confirmApplyDrive, selectedForm, currentRoll, session, students])

  async function handleFormFieldFileChange(fieldId: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setFormUploads((prev) => ({ ...prev, [fieldId]: true }))

    const formData = new FormData()
    formData.append('resume', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setFormValues((prev) => ({ ...prev, [fieldId]: data.fileUrl }))
      } else {
        alert(data.error || 'Failed to upload file.')
      }
    } catch (err) {
      console.error(err)
      alert('Network error while uploading file.')
    } finally {
      setFormUploads((prev) => ({ ...prev, [fieldId]: false }))
    }
  }

  function handleConfirmApply() {
    if (!confirmApplyDrive) return

    if (selectedForm) {
      for (const field of selectedForm.fields) {
        if (field.required && !formValues[field.id]) {
          alert(`Please fill in the required field: ${field.label}`)
          return
        }
        if (field.label.toLowerCase().includes('roll')) {
          const val = (formValues[field.id] || '').trim().toUpperCase()
          const exists = students.some(
            (s) => s.rollNumber.trim().toUpperCase() === val
          )
          if (!exists) {
            alert(`Error: Student Roll Number "${val}" does not exist in the Master Student database. Submission rejected.`)
            return
          }
        }
      }
    }

    const isUploading = Object.values(formUploads).some(Boolean)
    if (isUploading) {
      alert('Please wait for all file uploads to complete.')
      return
    }

    const valuesMappedByLabel: Record<string, string> = {}
    if (selectedForm) {
      selectedForm.fields.forEach((field) => {
        valuesMappedByLabel[field.label] = formValues[field.id] || ''
      })
    } else {
      valuesMappedByLabel['Roll Number'] = currentRoll
      valuesMappedByLabel['Full Name'] = session?.name || 'Student'
      valuesMappedByLabel['Branch'] = 'CSE'
    }

    const newSub: FormSubmission = {
      id: 'SUB-' + Date.now(),
      formId: confirmApplyDrive.formId || confirmApplyDrive.id,
      roll: currentRoll,
      name: session?.name || 'Student',
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Pending',
      values: valuesMappedByLabel,
    }

    submitSingleFormSubmission(newSub)

    setDrivesList((prev) =>
      prev.map((drive) =>
        drive.id === confirmApplyDrive.id ? { ...drive, status: 'Applied' as const } : drive
      )
    )

    setConfirmApplyDrive(null)

    if (viewingDrive && viewingDrive.id === confirmApplyDrive.id) {
      setViewingDrive((prev) => (prev ? { ...prev, status: 'Applied' as const } : null))
    }
  }

  const filtered = drivesList.filter((drive) => {
    const isSurvey = drive.sector === 'Survey / General' || drive.type === 'Survey Form' || drive.role.includes('SURVEY FORM') || drive.role.includes('Survey Form')
    if (filter === 'Survey Forms') {
      return isSurvey && (drive.company.toLowerCase().includes(search.toLowerCase()) || drive.role.toLowerCase().includes(search.toLowerCase()))
    }
    const matchesFilter = filter === 'All' || drive.status === filter
    const matchesSearch =
      drive.company.toLowerCase().includes(search.toLowerCase()) ||
      drive.role.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const renderDriveCard = (drive: typeof initialDrives[0]) => {
    const isSurvey = drive.sector === 'Survey / General' || drive.type === 'Survey Form' || drive.role.includes('SURVEY FORM') || drive.role.includes('Survey Form')
    return (
      <div key={drive.id} className="card-surface card-hover flex flex-col justify-between p-5">
        <div>
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isSurvey ? 'bg-purple-500/10 text-purple-600' : 'bg-primary/10 text-primary'}`}>
              {isSurvey ? <FileUp className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {isSurvey && (
                <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-bold text-purple-600 border border-purple-500/30 uppercase tracking-wider">
                  📋 SURVEY FORM
                </span>
              )}
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition shadow-sm ${
                  drive.status === 'Selected'
                    ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 animate-pulse'
                    : drive.status === 'Applied'
                      ? 'bg-info/15 text-info-foreground'
                      : drive.status === 'Closed'
                        ? 'bg-muted/50 text-muted-foreground border border-border'
                        : drive.status === 'Eligible'
                          ? 'bg-success/10 text-success'
                          : 'bg-destructive/10 text-destructive'
                }`}
              >
                {drive.status === 'Selected' ? '🎉 Selected' : drive.status}
              </span>
            </div>
          </div>
          <h3 className="text-lg font-bold leading-snug">{drive.company}</h3>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">{drive.role}</p>

          <div className="mt-4 space-y-2 border-y border-border py-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Package Offered:</span>
              <span className="text-sm font-bold text-foreground">{drive.packageLpa}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Minimum CGPA:</span>
              <span className="font-semibold">{drive.minCgpa <= 0 ? 'No Cutoff' : drive.minCgpa.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Backlogs Allowed:</span>
              <span className="font-semibold">{drive.maxBacklogsDisplay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Drive ID:</span>
              <span className="font-mono text-muted-foreground">{drive.id}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Apply by {drive.deadline}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewingDrive(drive)}
              className="rounded-lg border border-input px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Info className="inline h-3.5 w-3.5 mr-1" />
              Details
            </button>
            {drive.status === 'Selected' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 border border-emerald-500/30">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> 🎉 Selected
              </span>
            ) : drive.status === 'Eligible' ? (
              <button
                type="button"
                onClick={() => setConfirmApplyDrive({ id: drive.id, formId: drive.formId || '', company: drive.company })}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-pop hover:opacity-95 transition"
              >
                Apply Now
              </button>
            ) : drive.status === 'Applied' ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-info-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" /> Applied
              </span>
            ) : drive.status === 'Closed' ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                <XCircle className="h-3.5 w-3.5" /> Closed
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"
                title={drive.reason}
              >
                <XCircle className="h-3.5 w-3.5" /> Ineligible
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Placement Drives</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View active drives, eligibility conditions, package details, and application status.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {['All', 'Survey Forms', 'Selected', 'Eligible', 'Applied', 'Not Eligible'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${filter === status
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input hover:bg-muted'
                }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search drives by company or role..."
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

      {filter === 'All' ? (
        <div className="space-y-8">
          {/* Survey Forms Section */}
          {filtered.some((d) => d.sector === 'Survey / General' || d.type === 'Survey Form' || d.role.includes('SURVEY FORM')) && (
            <div>
              <div className="mb-4 flex items-center gap-2 border-b border-purple-500/20 pb-2">
                <FileUp className="h-5 w-5 text-purple-600" />
                <h2 className="text-xl font-bold text-foreground">Survey & General Forms</h2>
                <span className="ml-auto rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600">
                  {filtered.filter((d) => d.sector === 'Survey / General' || d.type === 'Survey Form' || d.role.includes('SURVEY FORM')).length} Form(s)
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered
                  .filter((d) => d.sector === 'Survey / General' || d.type === 'Survey Form' || d.role.includes('SURVEY FORM'))
                  .map((drive) => renderDriveCard(drive))}
              </div>
            </div>
          )}

          {/* Company Drives Section */}
          {filtered.some((d) => !(d.sector === 'Survey / General' || d.type === 'Survey Form' || d.role.includes('SURVEY FORM'))) && (
            <div>
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Company Placement Drives</h2>
                <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {filtered.filter((d) => !(d.sector === 'Survey / General' || d.type === 'Survey Form' || d.role.includes('SURVEY FORM'))).length} Drive(s)
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered
                  .filter((d) => !(d.sector === 'Survey / General' || d.type === 'Survey Form' || d.role.includes('SURVEY FORM')))
                  .map((drive) => renderDriveCard(drive))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((drive) => renderDriveCard(drive))}
        </div>
      )}

      {/* ───── Company Details Modal ───── */}
      {viewingDrive && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setViewingDrive(null) }}
        >
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto card-surface p-6 shadow-pop animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setViewingDrive(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{viewingDrive.company}</h2>
                <p className="text-sm text-muted-foreground">{viewingDrive.role}</p>
              </div>
            </div>

            {/* Status */}
            <div className="mb-5 flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  viewingDrive.status === 'Selected'
                    ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 animate-pulse'
                    : viewingDrive.status === 'Applied'
                      ? 'bg-info/15 text-info-foreground'
                      : viewingDrive.status === 'Closed'
                        ? 'bg-muted/50 text-muted-foreground border border-border'
                        : viewingDrive.status === 'Eligible'
                          ? 'bg-success/10 text-success'
                          : 'bg-destructive/10 text-destructive'
                }`}
              >
                {viewingDrive.status === 'Selected' ? '🎉 Selected' : viewingDrive.status}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${viewingDrive.driveStatus === 'Active'
                    ? 'bg-success/10 text-success'
                    : viewingDrive.driveStatus === 'Completed'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary/10 text-primary'
                  }`}
              >
                Drive: {viewingDrive.driveStatus}
              </span>
            </div>

            {/* Details Grid */}
            <div className="space-y-3 border-t border-border pt-4">
              <DetailRow icon={<IndianRupee className="h-4 w-4" />} label="Package" value={viewingDrive.packageLpa} highlight />
              <DetailRow icon={<GraduationCap className="h-4 w-4" />} label="Minimum CGPA" value={viewingDrive.minCgpa <= 0 ? 'No Cutoff' : viewingDrive.minCgpa.toFixed(2)} />
              <DetailRow icon={<AlertTriangle className="h-4 w-4 text-warning" />} label="Backlogs Allowed" value={viewingDrive.maxBacklogsDisplay} />
              <DetailRow icon={<Briefcase className="h-4 w-4" />} label="Sector" value={viewingDrive.sector} />
              <DetailRow icon={<Building2 className="h-4 w-4" />} label="Company Type" value={viewingDrive.type} />
              <DetailRow icon={<MapPin className="h-4 w-4" />} label="Location" value={viewingDrive.location} />
              <DetailRow icon={<Briefcase className="h-4 w-4" />} label="Job Type" value={viewingDrive.jobType} />
              <DetailRow icon={<Info className="h-4 w-4" />} label="Drive Mode" value={viewingDrive.mode} />
              <DetailRow icon={<Calendar className="h-4 w-4" />} label="Academic Year" value={viewingDrive.academicYear} />
              {viewingDrive.startDate && (
                <DetailRow icon={<Clock className="h-4 w-4" />} label="Application Opens" value={`${viewingDrive.startDate} at ${viewingDrive.startTime || '09:00'}`} />
              )}
              <DetailRow icon={<Clock className="h-4 w-4" />} label="Application Deadline" value={`${viewingDrive.deadline}${viewingDrive.endTime ? ' at ' + viewingDrive.endTime : ''}`} />
              {viewingDrive.remarks && (
                <DetailRow icon={<Info className="h-4 w-4" />} label="Remarks" value={viewingDrive.remarks} />
              )}
            </div>

            {/* Reason for ineligibility */}
            {viewingDrive.status === 'Not Eligible' && viewingDrive.reason && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">Not Eligible: </span>
                  {viewingDrive.reason}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setViewingDrive(null)}
                className="rounded-lg border border-input px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
              >
                Close
              </button>
              {viewingDrive.status === 'Selected' && (
                <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-600 border border-emerald-500/30">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" /> 🎉 Selected for this Company!
                </span>
              )}
              {viewingDrive.status === 'Eligible' && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmApplyDrive({ id: viewingDrive.id, formId: viewingDrive.formId || '', company: viewingDrive.company })
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 transition"
                >
                  Apply Now
                </button>
              )}
              {viewingDrive.status === 'Applied' && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-info-foreground">
                  <CheckCircle2 className="h-4 w-4" /> Already Applied
                </span>
              )}
              {viewingDrive.status === 'Closed' && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                  <XCircle className="h-4 w-4" /> Applications Closed
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───── Apply Confirmation & Form Popup ───── */}
      {confirmApplyDrive && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !Object.values(formUploads).some(Boolean)) {
              setConfirmApplyDrive(null)
            }
          }}
        >
          <div className="w-full max-w-lg card-surface p-6 shadow-pop animate-in zoom-in-95 duration-200 text-left overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold border-b border-border pb-3">
              Application Form: {confirmApplyDrive.company}
            </h3>

            {selectedForm ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleConfirmApply()
                }}
                className="mt-4 space-y-4"
              >
                <p className="text-xs text-muted-foreground mb-4">
                  Please fill in the required details to apply for this drive. Fields pre-filled from your academic records can be edited.
                </p>

                {selectedForm.fields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                      {field.label}
                      {field.required && <span className="text-destructive font-bold">*</span>}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        required={field.required}
                        placeholder={field.placeholder}
                        value={formValues[field.id] || ''}
                        onChange={(e) => setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={formValues[field.id] || ''}
                        onChange={(e) => setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select option</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'file' ? (
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm hover:bg-muted/30 transition">
                        {formUploads[field.id] ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        ) : (
                          <FileUp className="h-4 w-4 text-primary" />
                        )}
                        <span className="flex-1 truncate">
                          {formUploads[field.id]
                            ? 'Uploading document...'
                            : formValues[field.id]
                            ? formValues[field.id].split('/').pop()
                            : 'Upload resume / document'}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          disabled={formUploads[field.id]}
                          onChange={(e) => handleFormFieldFileChange(field.id, e)}
                        />
                      </label>
                    ) : (
                      <input
                        type={
                          field.type === 'number'
                            ? 'number'
                            : field.type === 'email'
                            ? 'email'
                            : field.type === 'date'
                            ? 'date'
                            : 'text'
                        }
                        required={field.required}
                        placeholder={field.placeholder}
                        value={formValues[field.id] || ''}
                        onChange={(e) => setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                      />
                    )}
                  </div>
                ))}

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    disabled={Object.values(formUploads).some(Boolean)}
                    onClick={() => setConfirmApplyDrive(null)}
                    className="rounded-lg border border-input px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={Object.values(formUploads).some(Boolean)}
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {Object.values(formUploads).some(Boolean) && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit Application
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center mt-4">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <AlertTriangle className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-bold">Confirm Application</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Are you sure you want to apply for the drive at{' '}
                  <span className="font-semibold text-foreground">{confirmApplyDrive.company}</span>?
                  This action cannot be undone.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmApplyDrive(null)}
                    className="rounded-lg border border-input px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApply}
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 transition"
                  >
                    Yes, Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/* Small sub-component for each detail row */
function DetailRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-muted-foreground w-36 shrink-0">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</span>
    </div>
  )
}
