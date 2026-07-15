import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  Copy,
  Download,
  Edit,
  Eye,
  FileText,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Info,
  Building2,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  loadFormSubmissions,
  loadMasterRows,
  loadPlacementForms,
  savePlacementForms,
  saveFormSubmissions,
  loadCompanies,
  saveCompanies,
  loadPlacementNotifications,
  savePlacementNotifications,
  type FormFieldConfig,
  type FormSubmission,
  type MasterStudentRow,
  type PlacementForm,
  type CompanyDrive,
  useStoreState,
} from '../../lib/placeproStore'
import {
  useAcademicYearOptions,
  getAcademicYearFromDate,
  getAcademicYearFromYop,
  normalizeAcademicYear,
  useAcademicYear,
} from '../../lib/AcademicYearContext'



const statusColors: Record<PlacementForm['status'], string> = {
  Active: 'bg-success/10 text-success',
  Closed: 'bg-muted text-muted-foreground',
  Draft: 'bg-warning/15 text-warning-foreground',
}

function trimObjectValues(values: Record<string, string>) {
  const normalized: Record<string, string> = {}
  Object.entries(values).forEach(([key, value]) => {
    normalized[key.trim()] = String(value ?? '').trim()
  })
  return normalized
}

function masterName(row: MasterStudentRow) {
  return row.fullName || [row.firstName, row.lastName].filter(Boolean).join(' ').trim()
}

function masterBacklogs(row: MasterStudentRow) {
  return (row.noOfBacklogs || row.activeBacklogs || '0').trim()
}

function generateNextFormId(existingForms: PlacementForm[]): string {
  let maxNum = 0
  existingForms.forEach((f) => {
    if (f.id) {
      const match = f.id.match(/^FRM-(\d+)/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (!Number.isNaN(num) && num > maxNum) {
          maxNum = num
        }
      }
    }
  })
  return `FRM-${String(maxNum + 1).padStart(3, '0')}`
}

function generateNextCompanyId(existingCompanies: CompanyDrive[]): string {
  let maxNum = 0
  existingCompanies.forEach((comp) => {
    if (comp.id) {
      const match = comp.id.match(/^COMP-(\d+)/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (!Number.isNaN(num) && num > maxNum) {
          maxNum = num
        }
      }
    }
  })
  return `COMP-${String(maxNum + 1).padStart(3, '0')}`
}

function dedupeAndReconcile(
  submissions: FormSubmission[],
  masterRows: MasterStudentRow[],
) {
  const byRoll = new Map<string, FormSubmission>()
  const masterByRoll = new Map(
    masterRows.map((row) => [row.rollNumber.trim().toUpperCase(), row]),
  )

  submissions.forEach((submission) => {
    const cleanRoll = submission.roll.trim().toUpperCase()
    const cleanName = submission.name.trim()
    const cleanValues = trimObjectValues(submission.values)
    byRoll.set(cleanRoll, {
      ...submission,
      roll: cleanRoll,
      name: cleanName,
      values: cleanValues,
    })
  })

  return Array.from(byRoll.values()).map((submission) => {
    const masterRow = masterByRoll.get(submission.roll)
    if (!masterRow) return submission

    const reconciledValues = {
      ...submission.values,
      'Roll Number': masterRow.rollNumber.trim(),
      'Full Name': masterName(masterRow),
      'Mail ID': masterRow.mailId.trim(),
      'Phone Number': masterRow.phoneNumber.trim(),
      Branch: masterRow.branch.trim(),
      '10TH': masterRow.tenthPercentage.trim(),
      '12TH': masterRow.twelfthPercentage.trim(),
      'B.TECH CGPA': masterRow.btechCgpa.trim(),
      'NO OF BACKLOGS': masterBacklogs(masterRow),
    }

    return {
      ...submission,
      roll: masterRow.rollNumber.trim(),
      name: masterName(masterRow),
      values: reconciledValues,
    }
  })
}

function getResponseCellValue(row: any, colKey: string, masterRow?: any) {
  if (colKey === 'Roll Number') return row.roll
  if (colKey === 'Student Name') return row.name
  if (colKey === 'Submitted At') return row.submittedAt
  if (colKey === 'Status') return row.status
  if (colKey === '10th %') return masterRow?.tenthPercentage || row.values['10th %'] || row.values['10TH'] || ''
  if (colKey === '12th %') return masterRow?.twelfthPercentage || row.values['12th %'] || row.values['12TH'] || ''
  if (colKey === 'CGPA') return masterRow?.btechCgpa || row.values['CGPA'] || row.values['B.TECH CGPA'] || ''
  if (colKey === 'Active Backlogs') return masterRow ? (masterRow.noOfBacklogs || masterRow.activeBacklogs || '0') : (row.values['Active Backlogs'] || row.values['NO OF BACKLOGS'] || '')
  if (colKey === 'Branch') return masterRow?.branch || row.values['Branch'] || ''
  if (colKey === 'Email') return masterRow?.mailId || row.values['Email'] || row.values['Mail ID'] || ''
  if (colKey === 'Phone') return masterRow?.phoneNumber || row.values['Phone'] || row.values['Phone Number'] || ''
  return row.values[colKey] || ''
}

function defaultField(type: FormFieldConfig['type'], label: string): FormFieldConfig {
  return {
    id: `fld-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    type,
    required: true,
    placeholder:
      type === 'textarea'
        ? 'Long answer text'
        : type === 'number'
          ? 'Enter a numeric value'
          : type === 'email'
            ? 'Enter a valid email'
            : 'Your answer',
    options: type === 'select' || type === 'radio' || type === 'checkbox'
      ? ['Option 1', 'Option 2']
      : undefined,
  }
}

export function AdminFormsPage() {
  const navigate = useNavigate()
  const { selectedYear } = useAcademicYear()
  const yearOptions = useAcademicYearOptions()
  const allForms = useStoreState(loadPlacementForms) ?? []
  const allSubmissions = useStoreState(loadFormSubmissions) ?? []

  const [filter, setFilter] = useState('All')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('Registration')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('18:00')
  const [formStatus, setFormStatus] = useState<PlacementForm['status']>('Draft')
  const [builderFields, setBuilderFields] = useState<FormFieldConfig[]>([
    defaultField('text', 'Roll Number'),
    defaultField('text', 'Full Name'),
  ])
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<FormFieldConfig['type']>('text')
  const [viewingFormId, setViewingFormId] = useState<string | null>(null)
  const [previewForm, setPreviewForm] = useState<PlacementForm | null>(null)
  const [responsesSearch, setResponsesSearch] = useState('')
  const [selectedResponseColumns, setSelectedResponseColumns] = useState<string[]>([
    'Roll Number',
    'Student Name',
    'Submitted At',
    'Status'
  ])
  const [showResponseColSelector, setShowResponseColSelector] = useState(false)

  // Filter modal states before download
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [filterMinTenth, setFilterMinTenth] = useState('')
  const [filterMinTwelfth, setFilterMinTwelfth] = useState('')
  const [filterMinCgpa, setFilterMinCgpa] = useState('')
  const [filterMaxBacklogs, setFilterMaxBacklogs] = useState('')
  const [filterSpecialConcerns, setFilterSpecialConcerns] = useState('')

  // Associated company drive details states
  const [hasCompanyDrive, setHasCompanyDrive] = useState(false)
  const [compName, setCompName] = useState('')
  const [compSector, setCompSector] = useState('Technology')
  const [compCategory, setCompCategory] = useState('Product')
  const [compLocation, setCompLocation] = useState('Hyderabad')
  const [compDriveMode, setCompDriveMode] = useState('Online')
  const [compJobType, setCompJobType] = useState('IT')
  const [compPkgMin, setCompPkgMin] = useState('')
  const [compPkgMax, setCompPkgMax] = useState('')
  const [compMinCgpa, setCompMinCgpa] = useState('')
  const [compMaxBacklogs, setCompMaxBacklogs] = useState('No Limit')
  const [compAcademicYear, setCompAcademicYear] = useState(selectedYear)
  const [compRemarks, setCompRemarks] = useState('')

  const allMasterRows = useStoreState(loadMasterRows) ?? []
  const formsList = useMemo(
    () =>
      allForms.filter((form) => {
        const companyYear = normalizeAcademicYear(form.academicYear || form.companyAcademicYear || '')
        const normalizedSelected = normalizeAcademicYear(selectedYear)
        return companyYear
          ? companyYear === normalizedSelected
          : getAcademicYearFromDate(form.created) === normalizedSelected
      }),
    [allForms, selectedYear],
  )
  const masterRows = useMemo(
    () =>
      allMasterRows.filter(
        (row) => (row.academicYear || getAcademicYearFromYop(row.btechYop)) === selectedYear,
      ),
    [allMasterRows, selectedYear],
  )



  const types = ['All', ...new Set(formsList.map((form) => form.type))]
  const filtered = formsList.filter((form) => filter === 'All' || form.type === filter)
  const selectedForm = viewingFormId
    ? formsList.find((form) => form.id === viewingFormId) ?? null
    : null

  const responseColumnsList = useMemo(() => {
    if (!selectedForm) return []
    const standardCols = [
      { key: 'Roll Number', label: 'Roll Number', default: true },
      { key: 'Student Name', label: 'Student Name', default: true },
      { key: 'Submitted At', label: 'Submitted Timestamp', default: true },
      { key: 'Status', label: 'Status', default: true },
      { key: '10th %', label: '10th %', default: false },
      { key: '12th %', label: '12th %', default: false },
      { key: 'CGPA', label: 'CGPA', default: false },
      { key: 'Active Backlogs', label: 'Active Backlogs', default: false },
      { key: 'Branch', label: 'Branch', default: false },
      { key: 'Email', label: 'Email', default: false },
      { key: 'Phone', label: 'Phone', default: false },
    ]
    const standardKeys = new Set(standardCols.map((c) => c.key.toUpperCase()))
    const customFields = selectedForm.fields
      .filter((f) => !standardKeys.has(f.label.toUpperCase()))
      .map((f) => ({
        key: f.label,
        label: f.label,
        default: true,
      }))
    return [...standardCols, ...customFields]
  }, [selectedForm])

  const prevViewingFormIdForColsRef = useRef<string | null>(null)

  useEffect(() => {
    if (viewingFormId !== prevViewingFormIdForColsRef.current) {
      prevViewingFormIdForColsRef.current = viewingFormId
      if (selectedForm && responseColumnsList.length > 0) {
        const defaults = responseColumnsList.filter((col) => col.default).map((col) => col.key)
        setSelectedResponseColumns(defaults)
        setShowResponseColSelector(false)
      }
    }
  }, [viewingFormId, responseColumnsList, selectedForm])
  const selectedSubmissions = useMemo(
    () => {
      const raw = allSubmissions.filter((submission) => submission.formId === viewingFormId)
      return dedupeAndReconcile(raw, masterRows)
    },
    [allSubmissions, viewingFormId, masterRows],
  )
  const filteredResponses = selectedSubmissions.filter(
    (response) =>
      response.name.toLowerCase().includes(responsesSearch.toLowerCase()) ||
      response.roll.toLowerCase().includes(responsesSearch.toLowerCase()),
  )

  const branchCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    selectedSubmissions.forEach((sub) => {
      const b = (sub.values['Branch'] || '').trim().toUpperCase() || 'UNKNOWN'
      counts[b] = (counts[b] || 0) + 1
    })
    return counts
  }, [selectedSubmissions])

  const filteredCount = useMemo(() => {
    const specialRolls = new Set(
      filterSpecialConcerns
        .split(/[\s,]+/)
        .map((r) => r.trim().toUpperCase())
        .filter(Boolean)
    )
    const submittedRolls = new Set(selectedSubmissions.map((s) => s.roll.trim().toUpperCase()))
    let extraSpecial = 0
    specialRolls.forEach((r) => {
      if (!submittedRolls.has(r)) extraSpecial++
    })

    const passing = selectedSubmissions.filter((sub) => {
      if (specialRolls.has(sub.roll.trim().toUpperCase())) return true

      const masterRow = masterRows.find(
        (m) => m.rollNumber.trim().toUpperCase() === sub.roll.trim().toUpperCase()
      )
      if (!masterRow) return true
      
      if (filterMinTenth) {
        const val = parseFloat(masterRow.tenthPercentage) || 0
        if (val < parseFloat(filterMinTenth)) return false
      }
      if (filterMinTwelfth) {
        const val = parseFloat(masterRow.twelfthPercentage) || 0
        if (val < parseFloat(filterMinTwelfth)) return false
      }
      if (filterMinCgpa) {
        const val = parseFloat(masterRow.btechCgpa) || 0
        if (val < parseFloat(filterMinCgpa)) return false
      }
      if (filterMaxBacklogs !== '') {
        const val = parseInt(masterBacklogs(masterRow)) || 0
        if (val > parseInt(filterMaxBacklogs)) return false
      }
      return true
    }).length

    return passing + extraSpecial
  }, [selectedSubmissions, masterRows, filterMinTenth, filterMinTwelfth, filterMinCgpa, filterMaxBacklogs, filterSpecialConcerns])

  useEffect(() => {
    if (!viewingFormId) return
    if (!formsList.some((form) => form.id === viewingFormId)) {
      setViewingFormId(null)
    }
  }, [formsList, viewingFormId])



  function showToast(message: string) {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  function formResponseCount(formId: string) {
    return dedupeAndReconcile(
      allSubmissions.filter((submission) => submission.formId === formId),
      masterRows,
    ).length
  }

  function resetModal() {
    setEditingId(null)
    setFormName('')
    setFormType('Registration')
    setStartDate('')
    setStartTime('09:00')
    setEndDate('')
    setEndTime('18:00')
    setFormStatus('Draft')
    setBuilderFields([defaultField('text', 'Roll Number'), defaultField('text', 'Full Name')])
    setNewFieldName('')
    setNewFieldType('text')
    setHasCompanyDrive(false)
    setCompName('')
    setCompSector('Technology')
    setCompCategory('Product')
    setCompLocation('Hyderabad')
    setCompDriveMode('Online')
    setCompJobType('IT')
    setCompPkgMin('')
    setCompPkgMax('')
    setCompMinCgpa('')
    setCompMaxBacklogs('No Limit')
    setCompAcademicYear(selectedYear)
    setCompRemarks('')
  }

  function handleAddField() {
    if (!newFieldName.trim()) return
    setBuilderFields((current) => [...current, defaultField(newFieldType, newFieldName.trim())])
    setNewFieldName('')
  }

  function handleRemoveField(id: string) {
    setBuilderFields((current) => current.filter((field) => field.id !== id))
  }

  function handleFieldChange(id: string, updates: Partial<FormFieldConfig>) {
    setBuilderFields((current) =>
      current.map((field) => (field.id === id ? { ...field, ...updates } : field)),
    )
  }

  async function toggleStatus(id: string) {
    const target = formsList.find((f) => f.id === id)
    if (!target) return
    const newStatus: PlacementForm['status'] = target.status === 'Active' ? 'Closed' : 'Active'

    await savePlacementForms(
      allForms.map((form) => (form.id === id ? { ...form, status: newStatus } : form)),
    )

    if (newStatus === 'Closed') {
      const masterByRoll = new Map(
        masterRows.map((row) => [row.rollNumber.trim().toUpperCase(), row]),
      )

      const otherSubmissions = allSubmissions.filter((sub) => sub.formId !== id)
      const thisFormSubmissions = allSubmissions.filter((sub) => sub.formId === id)

      const byRoll = new Map<string, FormSubmission>()
      thisFormSubmissions.forEach((sub) => {
        const cleanRoll = sub.roll.trim().toUpperCase()
        byRoll.set(cleanRoll, sub)
      })

      const cleanedAndReconciled = Array.from(byRoll.values()).map((sub) => {
        const cleanRoll = sub.roll.trim().toUpperCase()
        const masterRow = masterByRoll.get(cleanRoll)
        if (!masterRow) return sub

        const updatedValues = { ...sub.values }
        Object.keys(sub.values).forEach((key) => {
          const lowerKey = key.toLowerCase()
          const val = (sub.values[key] || '').trim()
          
          if (lowerKey.includes('roll')) {
            if (val !== masterRow.rollNumber.trim()) {
              updatedValues[key] = masterRow.rollNumber.trim()
            }
          } else if (lowerKey.includes('name')) {
            const mName = masterName(masterRow)
            if (val !== mName) {
              updatedValues[key] = mName
            }
          } else if (lowerKey.includes('email') || lowerKey.includes('mail')) {
            if (val !== masterRow.mailId.trim()) {
              updatedValues[key] = masterRow.mailId.trim()
            }
          } else if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
            if (val !== masterRow.phoneNumber.trim()) {
              updatedValues[key] = masterRow.phoneNumber.trim()
            }
          } else if (lowerKey.includes('branch') || lowerKey.includes('dept')) {
            if (val !== masterRow.branch.trim()) {
              updatedValues[key] = masterRow.branch.trim()
            }
          } else if (lowerKey.includes('10th') || lowerKey.includes('tenth')) {
            if (val !== masterRow.tenthPercentage.trim()) {
              updatedValues[key] = masterRow.tenthPercentage.trim()
            }
          } else if (lowerKey.includes('12th') || lowerKey.includes('twelfth')) {
            if (val !== masterRow.twelfthPercentage.trim()) {
              updatedValues[key] = masterRow.twelfthPercentage.trim()
            }
          } else if (lowerKey.includes('cgpa')) {
            if (val !== masterRow.btechCgpa.trim()) {
              updatedValues[key] = masterRow.btechCgpa.trim()
            }
          } else if (lowerKey.includes('backlog')) {
            const backlogs = masterBacklogs(masterRow)
            if (val !== backlogs) {
              updatedValues[key] = backlogs
            }
          }
        })

        return {
          ...sub,
          roll: masterRow.rollNumber.trim(),
          name: masterName(masterRow),
          values: updatedValues,
        }
      })

      await saveFormSubmissions([...otherSubmissions, ...cleanedAndReconciled])
    }
    showToast('Form status updated.')
  }

  async function handleDelete(id: string) {
    await savePlacementForms(allForms.filter((form) => form.id !== id))
    await saveFormSubmissions(allSubmissions.filter((submission) => submission.formId !== id))
    const companies = loadCompanies() || []
    const updatedCompanies = companies.filter((c) => c.formId !== id)
    await saveCompanies(updatedCompanies)
    showToast('Form deleted successfully.')
  }

  async function handleClone(id: string) {
    const target = formsList.find((form) => form.id === id)
    if (!target) return
    const cloned: PlacementForm = {
      ...target,
      id: generateNextFormId(allForms),
      name: `${target.name} Copy`,
      status: 'Draft',
      created: new Date().toISOString().split('T')[0],
      fields: target.fields.map((field) => ({
        ...field,
        id: `${field.id}-copy-${Math.random().toString(36).slice(2, 5)}`,
      })),
      academicYear: selectedYear,
      companyAcademicYear: target.hasCompanyDrive ? selectedYear : undefined,
    }
    await savePlacementForms([cloned, ...allForms])
    showToast('Form cloned successfully.')
  }

  function openEditModal(id: string) {
    const target = formsList.find((form) => form.id === id)
    if (!target) return
    setEditingId(id)
    setFormName(target.name)
    setFormType(target.type)
    setStartDate(target.startDate)
    setStartTime(target.startTime)
    setEndDate(target.endDate)
    setEndTime(target.endTime)
    setFormStatus(target.status)
    setBuilderFields(target.fields)
    setHasCompanyDrive(!!target.hasCompanyDrive)
    setCompName(target.companyName ?? '')
    setCompSector(target.companySector ?? 'Technology')
    setCompCategory(target.companyCategory ?? 'Product')
    setCompLocation(target.companyLocation ?? 'Hyderabad')
    setCompDriveMode(target.companyDriveMode ?? 'Online')
    setCompJobType(target.companyJobType ?? 'IT')
    setCompPkgMin(target.companyPkgMin ?? '')
    setCompPkgMax(target.companyPkgMax ?? '')
    setCompMinCgpa(target.companyMinCgpa ?? '')
    setCompMaxBacklogs(target.companyMaxBacklogs ?? 'No Limit')
    setCompAcademicYear(normalizeAcademicYear(target.companyAcademicYear) || selectedYear)
    setCompRemarks(target.companyRemarks ?? '')
    setIsOpen(true)
  }

  async function handleSaveForm(event: React.FormEvent) {
    event.preventDefault()
    if (!formName || !endDate || builderFields.length === 0) return

    const nextForm: PlacementForm = {
      id: editingId ?? generateNextFormId(allForms),
      name: formName.trim(),
      type: formType,
      status: editingId ? formStatus : 'Active',
      created: editingId
        ? allForms.find((form) => form.id === editingId)?.created ?? new Date().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      startDate: startDate || new Date().toISOString().split('T')[0],
      startTime,
      endDate,
      endTime,
      total: 2000,
      fields: builderFields.map((field) => ({
        ...field,
        label: field.label.trim(),
        placeholder: field.placeholder?.trim(),
        options: field.options?.map((option) => option.trim()).filter(Boolean),
      })),
      hasCompanyDrive,
      companyName: hasCompanyDrive ? compName.trim() : undefined,
      companySector: hasCompanyDrive ? compSector : undefined,
      companyCategory: hasCompanyDrive ? compCategory : undefined,
      companyLocation: hasCompanyDrive ? compLocation.trim() : undefined,
      companyDriveMode: hasCompanyDrive ? compDriveMode : undefined,
      companyJobType: hasCompanyDrive ? compJobType : undefined,
      companyPkgMin: hasCompanyDrive ? compPkgMin : undefined,
      companyPkgMax: hasCompanyDrive ? compPkgMax : undefined,
      companyMinCgpa: hasCompanyDrive ? compMinCgpa : undefined,
      companyMaxBacklogs: hasCompanyDrive ? compMaxBacklogs : undefined,
      companyAcademicYear: hasCompanyDrive ? normalizeAcademicYear(compAcademicYear) || selectedYear : undefined,
      companyRemarks: hasCompanyDrive ? compRemarks.trim() : undefined,
      academicYear: selectedYear,
    }

    if (editingId) {
      await savePlacementForms(allForms.map((form) => (form.id === editingId ? nextForm : form)))
      if (formStatus === 'Closed') {
        const masterByRoll = new Map(
          masterRows.map((row) => [row.rollNumber.trim().toUpperCase(), row]),
        )

        const otherSubmissions = allSubmissions.filter((sub) => sub.formId !== editingId)
        const thisFormSubmissions = allSubmissions.filter((sub) => sub.formId === editingId)

        const byRoll = new Map<string, FormSubmission>()
        thisFormSubmissions.forEach((sub) => {
          byRoll.set(sub.roll.trim().toUpperCase(), sub)
        })

        const cleanedAndReconciled: FormSubmission[] = Array.from(byRoll.values()).map((sub) => {
          const masterRow = masterByRoll.get(sub.roll.trim().toUpperCase())
          if (!masterRow) return sub

          const updatedValues = { ...sub.values }
          Object.entries(updatedValues).forEach(([key, val]) => {
            const k = key.toLowerCase()
            if (k.includes('cgpa') || k.includes('percentage') || k.includes('10th') || k.includes('12th')) {
              if (k.includes('10th')) {
                const tenth = (masterRow.tenthPercentage || '0').trim()
                if (val !== tenth && parseFloat(tenth) > 0) updatedValues[key] = tenth
              } else if (k.includes('12th')) {
                const twelfth = (masterRow.twelfthPercentage || '0').trim()
                if (val !== twelfth && parseFloat(twelfth) > 0) updatedValues[key] = twelfth
              } else if (k.includes('cgpa')) {
                const cgpa = (masterRow.btechCgpa || '0').trim()
                if (val !== cgpa && parseFloat(cgpa) > 0) updatedValues[key] = cgpa
              }
            }
            if (k.includes('backlog')) {
              const backlogs = masterBacklogs(masterRow)
              if (val !== backlogs) {
                updatedValues[key] = backlogs
              }
            }
          })

          return {
            ...sub,
            roll: masterRow.rollNumber.trim(),
            name: masterName(masterRow),
            values: updatedValues,
          }
        })

        saveFormSubmissions([...otherSubmissions, ...cleanedAndReconciled])
      }
      showToast('Form updated successfully.')
      setIsOpen(false)
      resetModal()
    } else {
      await savePlacementForms([nextForm, ...allForms])
      
      const notifications = loadPlacementNotifications() || []
      notifications.unshift({
        id: `notif-form-${Date.now()}`,
        rollNumber: 'SYSTEM',
        studentName: 'All Students',
        company: `New Form Published: ${nextForm.name}`,
        role: `A new ${nextForm.type} form has been published. Please check your forms section.`,
        package: '-',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        read: false,
        type: 'announcement',
      })
      await savePlacementNotifications(notifications)
      
      showToast('Form published successfully.')
      setIsOpen(false)
      // Reset builder fields
      setFormName('')
      setFormType('Registration')
      setStartDate('')
      setEndDate('')
      setBuilderFields([{ id: `fld-${Date.now()}`, label: 'Full Name', type: 'text', required: true, placeholder: 'Enter your full name' }])
    }

    // Automatically create or update the company drive
    if (hasCompanyDrive && compName.trim()) {
      const companies = loadCompanies()
      const existingCompIndex = companies.findIndex((c) => c.formId === nextForm.id)
      
      const companyPkg = `₹ ${compPkgMin}–${compPkgMax} LPA`
      const nextCompany: CompanyDrive = {
        id: existingCompIndex !== -1 ? companies[existingCompIndex].id : generateNextCompanyId(companies),
        name: compName.trim(),
        sector: compSector,
        type: compCategory,
        location: compLocation.trim(),
        drives: existingCompIndex !== -1 ? companies[existingCompIndex].drives : 1,
        hires: existingCompIndex !== -1 ? companies[existingCompIndex].hires : 0,
        package: companyPkg,
        status: nextForm.status === 'Closed' ? 'Completed' : (nextForm.status === 'Active' ? 'Active' : 'Upcoming'),
        mode: compDriveMode,
        jobType: compJobType,
        academicYear: normalizeAcademicYear(compAcademicYear) || selectedYear,
        remarks: (compRemarks.trim() + (compMinCgpa && compMinCgpa !== '0' ? ` [Min CGPA: ${compMinCgpa}]` : '') + (compMaxBacklogs && compMaxBacklogs !== 'No Limit' ? ` [Max Backlogs: ${compMaxBacklogs}]` : '')).trim(),
        minCgpa: compMinCgpa,
        maxBacklogs: compMaxBacklogs,
        formId: nextForm.id,
      }

      if (existingCompIndex !== -1) {
        companies[existingCompIndex] = nextCompany
      } else {
        companies.push(nextCompany)
      }
      await saveCompanies(companies)
    }

    setIsOpen(false)
    resetModal()
  }

  function handleDownloadFiltered(formId: string) {
    const form = formsList.find((item) => item.id === formId)
    if (!form) return

    const subs = allSubmissions.filter((submission) => submission.formId === formId)

    const specialRolls = new Set(
      filterSpecialConcerns
        .split(/[\s,]+/)
        .map((r) => r.trim().toUpperCase())
        .filter(Boolean)
    )

    const byRoll = new Map<string, FormSubmission>()
    subs.forEach((sub) => byRoll.set(sub.roll.trim().toUpperCase(), sub))

    specialRolls.forEach((sRoll) => {
      if (!byRoll.has(sRoll)) {
        const mRow = masterRows.find((m) => m.rollNumber.trim().toUpperCase() === sRoll)
        byRoll.set(sRoll, {
          id: `special-override-${sRoll}-${formId}`,
          formId,
          roll: sRoll,
          name: mRow ? (mRow.fullName || `${mRow.firstName} ${mRow.lastName}`.trim()) : 'Special Concern Student',
          mail: mRow?.mailId || '',
          values: {
            Branch: mRow?.branch || '',
            CGPA: mRow?.btechCgpa || '',
            'NO OF BACKLOGS': mRow?.activeBacklogs || '0',
          },
          submittedAt: new Date().toISOString(),
        } as any)
      }
    })

    const allCandidateSubs = Array.from(byRoll.values())

    const filtered = allCandidateSubs.filter((sub) => {
      if (specialRolls.has(sub.roll.trim().toUpperCase())) return true

      const masterRow = masterRows.find(
        (m) => m.rollNumber.trim().toUpperCase() === sub.roll.trim().toUpperCase()
      )
      if (!masterRow) return true
      
      if (filterMinTenth) {
        const val = parseFloat(masterRow.tenthPercentage) || 0
        if (val < parseFloat(filterMinTenth)) return false
      }
      if (filterMinTwelfth) {
        const val = parseFloat(masterRow.twelfthPercentage) || 0
        if (val < parseFloat(filterMinTwelfth)) return false
      }
      if (filterMinCgpa) {
        const val = parseFloat(masterRow.btechCgpa) || 0
        if (val < parseFloat(filterMinCgpa)) return false
      }
      if (filterMaxBacklogs !== '') {
        const val = parseInt(masterBacklogs(masterRow)) || 0
        if (val > parseInt(filterMaxBacklogs)) return false
      }
      return true
    })

    const exportRows = filtered.map((submission) => {
      const masterRow = masterRows.find(
        (m) => m.rollNumber.trim().toUpperCase() === submission.roll.trim().toUpperCase()
      )
      const result: Record<string, string> = {}
      selectedResponseColumns.forEach((colKey) => {
        result[colKey] = getResponseCellValue(submission, colKey, masterRow)
      })
      return result
    })

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses')
    XLSX.writeFile(
      workbook,
      `${form.name.replace(/\s+/g, '_').toLowerCase()}_responses.xlsx`,
    )
    setIsFilterModalOpen(false)
    showToast('Filtered responses downloaded successfully.')
  }

  function handleDownloadBranch(formId: string, branch: string) {
    const form = formsList.find((item) => item.id === formId)
    if (!form) return

    const subs = allSubmissions.filter((submission) => submission.formId === formId)
    const reconciledSubs = dedupeAndReconcile(subs, masterRows)

    const filtered = reconciledSubs.filter((sub) => {
      const subBranch = (sub.values['Branch'] || '').trim().toUpperCase()
      return subBranch === branch.toUpperCase()
    })

    const exportRows = filtered.map((submission) => {
      const masterRow = masterRows.find(
        (m) => m.rollNumber.trim().toUpperCase() === submission.roll.trim().toUpperCase()
      )
      const result: Record<string, string> = {}
      selectedResponseColumns.forEach((colKey) => {
        result[colKey] = getResponseCellValue(submission, colKey, masterRow)
      })
      return result
    })

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses')
    XLSX.writeFile(
      workbook,
      `${form.name.replace(/\s+/g, '_').toLowerCase()}_${branch.toLowerCase()}_responses.xlsx`,
    )
    showToast(`${branch} branch responses downloaded successfully.`)
  }

  return (
    <>
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-pop animate-in fade-in duration-300">
          {toastMessage}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Forms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build Google-Form-style registration forms, publish them to students, and download cleaned submissions reconciled with master data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetModal()
            setIsOpen(true)
          }}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
        >
          <Plus className="h-4 w-4" /> Create form
        </button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Forms', value: String(formsList.length) },
          { label: 'Active Forms', value: String(formsList.filter((form) => form.status === 'Active').length) },
          { label: 'Student Deliveries', value: String(formsList.filter((form) => form.status === 'Active').length) },
          {
            label: 'Unique Valid Responses',
            value: String(
              formsList.reduce((sum, form) => sum + formResponseCount(form.id), 0),
            ),
          },
        ].map((card) => (
          <div key={card.label} className="card-surface p-4 text-center">
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {types.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              filter === type
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input hover:bg-muted'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((form) => (
          <div key={form.id} className="card-surface card-hover flex flex-col justify-between p-5">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusColors[form.status]}`}>
                  {form.status}
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold leading-snug">{form.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {form.type} · {form.id}
              </p>

              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Start: {form.startDate} at {form.startTime}
                </div>
                <div className="flex items-center gap-1 font-semibold text-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Close: {form.endDate} at {form.endTime}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Unique Responses</div>
                  <div className="mt-0.5 text-base font-bold">
                    {formResponseCount(form.id)}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      / {form.total}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Fields</div>
                  <div className="mt-0.5 truncate font-semibold text-muted-foreground">
                    {form.fields.map((field) => field.label).join(', ')}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setViewingFormId(form.id)}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm font-semibold text-primary hover:bg-primary/10 cursor-pointer transition"
              >
                <Eye className="h-4 w-4" /> Responses
              </button>
              <button
                type="button"
                onClick={() => setPreviewForm(form)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer transition dark:border-slate-600 dark:bg-slate-500/10 dark:text-slate-300 dark:hover:bg-slate-500/20"
              >
                <Info className="h-4 w-4" /> View
              </button>
              <button
                type="button"
                onClick={() => openEditModal(form.id)}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 cursor-pointer transition dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
              >
                <Edit className="h-4 w-4" /> Edit
              </button>
              <button
                type="button"
                onClick={() => handleClone(form.id)}
                className="inline-flex items-center gap-2 rounded-lg border border-violet-400/30 bg-violet-50 px-3.5 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 cursor-pointer transition dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20"
              >
                <Copy className="h-4 w-4" /> Clone
              </button>
              <button
                type="button"
                onClick={() => handleDelete(form.id)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300/40 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 cursor-pointer transition dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => toggleStatus(form.id)}
                className="ml-auto inline-flex items-center gap-2 rounded-lg border border-input bg-muted/30 px-3.5 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition"
              >
                {form.status === 'Active' ? (
                  <ToggleRight className="h-4.5 w-4.5 text-primary" />
                ) : (
                  <ToggleLeft className="h-4.5 w-4.5" />
                )}
                {form.status === 'Active' ? 'Close' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto card-surface p-6 shadow-pop animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-bold text-foreground">
              {editingId ? 'Edit Form' : 'Create New Form'}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure the form like a modern online form, publish it to the student dashboard, and include the closing date and time.
            </p>

            <form onSubmit={handleSaveForm} className="mt-4 grid gap-6 lg:grid-cols-[1fr,360px]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Form Name</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(event) => setFormName(event.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Form Type</label>
                    <select
                      value={formType}
                      onChange={(event) => setFormType(event.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                    >
                      <option value="Registration">Placement Registration</option>
                      <option value="Drive Application">Drive Application</option>
                      <option value="Verification">Verification</option>
                      <option value="Survey">Survey</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Close Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Close Time</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/10 p-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCompanyDrive}
                      onChange={(event) => {
                        setHasCompanyDrive(event.target.checked)
                        if (event.target.checked && formType !== 'Drive Application') {
                          setFormType('Drive Application')
                        }
                      }}
                      className="rounded border-input text-primary"
                    />
                    Associate with Company Drive (Auto-Folder Creation)
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enabling this will automatically create a matching recruitment folder in the Companies directory.
                  </p>

                  {hasCompanyDrive && (
                    <div className="mt-4 space-y-4 border-t border-border pt-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase">Company Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Amazon"
                            value={compName}
                            onChange={(e) => setCompName(e.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase">Sector</label>
                          <select
                            value={compSector}
                            onChange={(e) => setCompSector(e.target.value)}
                            className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                          >
                            <option value="Technology">Technology</option>
                            <option value="Consulting">Consulting</option>
                            <option value="Finance">Finance</option>
                            <option value="IT Services">IT Services</option>
                            <option value="Core Engineering">Core Engineering</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase">Category</label>
                          <select
                            value={compCategory}
                            onChange={(e) => setCompCategory(e.target.value)}
                            className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                          >
                            <option value="Product">Product Company</option>
                            <option value="Service">Service Company</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase">Location</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Hyderabad"
                            value={compLocation}
                            onChange={(e) => setCompLocation(e.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase">Drive Mode</label>
                          <select
                            value={compDriveMode}
                            onChange={(e) => setCompDriveMode(e.target.value)}
                            className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                          >
                            <option value="Online">Online</option>
                            <option value="Offline">Offline</option>
                            <option value="Hybrid">Hybrid</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase">Job Type</label>
                          <select
                            value={compJobType}
                            onChange={(e) => setCompJobType(e.target.value)}
                            className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                          >
                            <option value="IT">IT</option>
                            <option value="Core">Core</option>
                            <option value="Consulting">Consulting</option>
                            <option value="Analytics">Analytics</option>
                            <option value="Management">Management</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase">Academic Year</label>
                          <select
                            value={compAcademicYear}
                            onChange={(e) => setCompAcademicYear(e.target.value)}
                            className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                          >
                            {yearOptions.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Min Pkg (LPA)</label>
                            <input
                              type="number"
                              required
                              placeholder="Min"
                              value={compPkgMin}
                              onChange={(e) => setCompPkgMin(e.target.value)}
                              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Max Pkg (LPA)</label>
                            <input
                              type="number"
                              placeholder="Max"
                              value={compPkgMax}
                              onChange={(e) => setCompPkgMax(e.target.value)}
                              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 border border-primary/20 bg-primary/5 p-3 rounded-lg">
                        <div>
                          <label className="text-[11px] font-bold text-primary uppercase block">Min CGPA Required</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 7.0 (0 for no cutoff)"
                            value={compMinCgpa}
                            onChange={(e) => setCompMinCgpa(e.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-primary uppercase block">Max Active Backlogs Allowed</label>
                          <select
                            value={compMaxBacklogs}
                            onChange={(e) => setCompMaxBacklogs(e.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                          >
                            <option value="No Limit">No Limit</option>
                            <option value="0">0 (No Active Backlogs)</option>
                            <option value="1">At most 1 Backlog</option>
                            <option value="2">At most 2 Backlogs</option>
                            <option value="3">At most 3 Backlogs</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase">Remarks</label>
                        <textarea
                          placeholder="e.g. Requires strong DSA fundamentals."
                          value={compRemarks}
                          onChange={(e) => setCompRemarks(e.target.value)}
                          className="mt-1.5 h-20 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {editingId && (
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Form Status</label>
                    <select
                      value={formStatus}
                      onChange={(event) => setFormStatus(event.target.value as PlacementForm['status'])}
                      className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                    >
                      <option value="Active">Active</option>
                      <option value="Closed">Closed</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-bold text-foreground">Question Builder</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Add fields like a form builder. Students receive these active forms on their dashboard.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      type="text"
                      placeholder="Question title"
                      value={newFieldName}
                      onChange={(event) => setNewFieldName(event.target.value)}
                      className="h-10 min-w-[240px] flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                    />
                    <select
                      value={newFieldType}
                      onChange={(event) => setNewFieldType(event.target.value as FormFieldConfig['type'])}
                      className="h-10 w-44 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                    >
                      <option value="text">Short Answer</option>
                      <option value="textarea">Paragraph</option>
                      <option value="number">Number</option>
                      <option value="email">Email</option>
                      <option value="date">Date</option>
                      <option value="select">Dropdown</option>
                      <option value="radio">Multiple Choice</option>
                      <option value="checkbox">Checkboxes</option>
                      <option value="file">File Upload</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddField}
                      className="h-10 rounded-lg bg-muted px-4 text-sm font-semibold text-foreground hover:bg-muted/80"
                    >
                      Add Question
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {builderFields.map((field, index) => (
                      <div key={field.id} className="rounded-xl border border-border bg-muted/10 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-foreground">
                            Question {index + 1}
                          </div>
                          {index > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveField(field.id)}
                              className="text-xs font-semibold text-destructive hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(event) =>
                              handleFieldChange(field.id, { label: event.target.value })
                            }
                            className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                          />
                          <input
                            type="text"
                            value={field.placeholder ?? ''}
                            onChange={(event) =>
                              handleFieldChange(field.id, { placeholder: event.target.value })
                            }
                            className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                            placeholder="Placeholder"
                          />
                        </div>
                        {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                          <textarea
                            value={(field.options ?? []).join(', ')}
                            onChange={(event) =>
                              handleFieldChange(field.id, {
                                options: event.target.value
                                  .split(',')
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="mt-3 h-20 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                            placeholder="Comma-separated options"
                          />
                        )}
                        <div className="mt-3 flex items-center gap-4">
                          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(event) =>
                                handleFieldChange(field.id, { required: event.target.checked })
                              }
                            />
                            Required
                          </label>

                          <button
                            type="button"
                            className="text-xs font-semibold text-primary hover:underline"
                            onClick={() => {
                              const hasValidation = field.minValue !== undefined || field.minLength !== undefined || field.pattern !== undefined
                              if (hasValidation) {
                                handleFieldChange(field.id, {
                                  minValue: undefined,
                                  maxValue: undefined,
                                  minLength: undefined,
                                  maxLength: undefined,
                                  pattern: undefined,
                                  customErrorMessage: undefined,
                                })
                              } else {
                                handleFieldChange(field.id, {
                                  minValue: '',
                                  maxValue: '',
                                  minLength: '',
                                  maxLength: '',
                                  pattern: '',
                                  customErrorMessage: '',
                                })
                              }
                            }}
                          >
                            {(field.minValue !== undefined || field.minLength !== undefined || field.pattern !== undefined)
                              ? 'Remove Response Validation'
                              : 'Add Response Validation'}
                          </button>
                        </div>

                        {(field.minValue !== undefined || field.minLength !== undefined || field.pattern !== undefined) && (
                          <div className="mt-3 border-t border-dashed border-border pt-3">
                            <div className="text-xs font-bold text-foreground mb-2">Response Validation Constraints</div>
                            <div className="grid gap-3 sm:grid-cols-2 bg-muted/40 p-3 rounded-lg border border-border/50">
                              {field.type === 'number' ? (
                                <>
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Min Value</label>
                                    <input
                                      type="number"
                                      value={field.minValue ?? ''}
                                      onChange={(e) => handleFieldChange(field.id, { minValue: e.target.value })}
                                      placeholder="e.g. 0"
                                      className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs outline-none focus:border-ring"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Max Value</label>
                                    <input
                                      type="number"
                                      value={field.maxValue ?? ''}
                                      onChange={(e) => handleFieldChange(field.id, { maxValue: e.target.value })}
                                      placeholder="e.g. 100"
                                      className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs outline-none focus:border-ring"
                                    />
                                  </div>
                                </>
                              ) : (field.type === 'text' || field.type === 'textarea' || field.type === 'email') ? (
                                <>
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Min Length</label>
                                    <input
                                      type="number"
                                      value={field.minLength ?? ''}
                                      onChange={(e) => handleFieldChange(field.id, { minLength: e.target.value })}
                                      placeholder="e.g. 5"
                                      className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs outline-none focus:border-ring"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Max Length</label>
                                    <input
                                      type="number"
                                      value={field.maxLength ?? ''}
                                      onChange={(e) => handleFieldChange(field.id, { maxLength: e.target.value })}
                                      placeholder="e.g. 150"
                                      className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs outline-none focus:border-ring"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Pattern (Regex Expression)</label>
                                    <input
                                      type="text"
                                      value={field.pattern ?? ''}
                                      onChange={(e) => handleFieldChange(field.id, { pattern: e.target.value })}
                                      placeholder="e.g. ^[0-9]{10}$ (for 10 digit number)"
                                      className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs outline-none focus:border-ring"
                                    />
                                  </div>
                                </>
                              ) : (
                                <div className="sm:col-span-2 text-xs text-muted-foreground">
                                  No additional validation rules available for this question type.
                                </div>
                              )}
                              
                              {(field.type === 'number' || field.type === 'text' || field.type === 'textarea' || field.type === 'email') && (
                                <div className="sm:col-span-2">
                                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">Custom Error Text</label>
                                  <input
                                    type="text"
                                    value={field.customErrorMessage ?? ''}
                                    onChange={(e) => handleFieldChange(field.id, { customErrorMessage: e.target.value })}
                                    placeholder="e.g. Please enter a valid input"
                                    className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs outline-none focus:border-ring"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="h-10 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
                  >
                    {editingId ? 'Save Form' : 'Publish Form'}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-5">
                <div className="rounded-xl bg-primary px-4 py-6 text-primary-foreground">
                  <div className="text-lg font-bold">{formName || 'Untitled Form'}</div>
                  <div className="mt-1 text-xs opacity-90">
                    Opens {startDate || 'Immediately'} {startTime && `at ${startTime}`} · closes {endDate || 'Not set'} {endTime && `at ${endTime}`}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {builderFields.map((field) => (
                    <div key={field.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="text-sm font-semibold">
                        {field.label}
                        {field.required && <span className="ml-1 text-destructive">*</span>}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {field.type === 'textarea'
                          ? 'Long answer text'
                          : field.type === 'select' || field.type === 'radio' || field.type === 'checkbox'
                            ? (field.options ?? []).join(' · ')
                            : field.placeholder || 'Student input'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingFormId && selectedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl card-surface p-6 shadow-pop animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setViewingFormId(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Student Responses</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Download removes duplicates, trims spaces, and reconciles values using the master student data by roll number.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowResponseColSelector(!showResponseColSelector)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold cursor-pointer transition-colors ${
                    showResponseColSelector
                      ? 'border-primary bg-primary text-primary-foreground font-semibold'
                      : 'border-input bg-background hover:bg-muted text-foreground'
                  }`}
                >
                  Columns
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/placements?tab=comparison&formId=${selectedForm.id}`)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-xs font-semibold hover:bg-muted text-primary cursor-pointer"
                >
                  Filter Placed Students
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMinTenth('')
                    setFilterMinTwelfth('')
                    setFilterMinCgpa('')
                    setFilterMaxBacklogs('')
                    setFilterSpecialConcerns('')
                    setIsFilterModalOpen(true)
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-xs font-semibold hover:bg-muted"
                >
                  <Download className="h-3.5 w-3.5" /> Download Responses
                </button>
              </div>
            </div>

            {/* Collapsible Column Selector */}
            {showResponseColSelector && (
              <div className="mb-4 rounded-xl border border-border bg-muted/20 p-4 animate-in slide-in-from-top-2 duration-200">
                <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Select columns to display & download</span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedResponseColumns(responseColumnsList.map((c) => c.key))}
                      className="text-primary hover:underline font-bold normal-case cursor-pointer text-xs"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedResponseColumns(responseColumnsList.filter((c) => c.default).map((c) => c.key))}
                      className="text-primary hover:underline font-bold normal-case cursor-pointer text-xs"
                    >
                      Reset Defaults
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 max-h-40 overflow-y-auto pr-1">
                  {responseColumnsList.map((col) => (
                    <label
                      key={col.key}
                      className="flex cursor-pointer items-center gap-2 rounded border border-border bg-background p-2 text-xs hover:bg-muted/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedResponseColumns.includes(col.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedResponseColumns([...selectedResponseColumns, col.key])
                          } else {
                            setSelectedResponseColumns(selectedResponseColumns.filter((k) => k !== col.key))
                          }
                        }}
                        className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="font-medium text-foreground truncate">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4 rounded-lg border border-success/20 bg-success/15 p-3 text-xs text-success">
              Duplicate submissions are cleaned internally using the latest submission per roll number, then verified against master data before export.
            </div>

            {/* Branch-wise counts and download options */}
            <div className="mb-4 border border-border bg-slate-50/50 p-3.5 rounded-xl dark:bg-slate-900/30">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Branch-wise Submissions & Downloads
              </div>
              <div className="flex flex-wrap gap-2.5">
                {Object.keys(branchCounts).length > 0 ? (
                  Object.entries(branchCounts).map(([branch, count]) => (
                    <div
                      key={branch}
                      className="inline-flex items-center gap-2 bg-white border border-slate-205 pl-3 pr-2 py-1 rounded-lg text-xs font-semibold shadow-sm dark:bg-slate-800 dark:border-slate-700"
                    >
                      <span className="text-slate-700 dark:text-slate-300">{branch}</span>
                      <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md text-[10px] font-bold dark:bg-blue-900/30 dark:text-blue-300 font-mono">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadBranch(selectedForm.id, branch)}
                        title={`Download Excel for ${branch}`}
                        className="text-slate-400 hover:text-primary transition p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-center"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground italic py-1">
                    No submissions recorded yet to group by branch.
                  </div>
                )}
              </div>
            </div>

            <div className="relative mb-4 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search responses by roll number or name..."
                value={responsesSearch}
                onChange={(event) => setResponsesSearch(event.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                    {responseColumnsList.filter((col) => selectedResponseColumns.includes(col.key)).map((col) => (
                      <th key={col.key} className="px-4 py-2 font-medium">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredResponses.map((row) => {
                    const masterRow = masterRows.find(
                      (m) => m.rollNumber.trim().toUpperCase() === row.roll.trim().toUpperCase()
                    )
                    return (
                      <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        {responseColumnsList.filter((col) => selectedResponseColumns.includes(col.key)).map((col) => {
                          const val = getResponseCellValue(row, col.key, masterRow)
                          if (col.key === 'Status') {
                            return (
                              <td key={col.key} className="px-4 py-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    val === 'Approved'
                                      ? 'bg-success/10 text-success'
                                      : 'bg-warning/15 text-warning-foreground'
                                  }`}
                                >
                                  {val}
                                </span>
                            </td>
                          )
                        }
                        return (
                          <td
                            key={col.key}
                            className={`px-4 py-2 ${col.key === 'Roll Number' || col.key === 'Submitted At' ? 'font-mono' : ''} ${
                              col.key === 'Student Name' ? 'font-semibold text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {val}
                          </td>
                        )
                      })}
                    </tr>
                  )})}
                  {filteredResponses.length === 0 && (
                    <tr>
                      <td colSpan={selectedResponseColumns.length || 1} className="px-4 py-6 text-center text-muted-foreground">
                        No student responses found for this form.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isFilterModalOpen && selectedForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md card-surface p-6 shadow-pop animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Download Filters
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Filter student submissions before downloading Excel. Leave fields blank to skip that filter.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Min 10th Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 60.0"
                  value={filterMinTenth}
                  onChange={(e) => setFilterMinTenth(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Min 12th Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 60.0"
                  value={filterMinTwelfth}
                  onChange={(e) => setFilterMinTwelfth(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Min B.Tech CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="e.g. 7.5"
                    value={filterMinCgpa}
                    onChange={(e) => setFilterMinCgpa(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Max Active Backlogs</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 0"
                    value={filterMaxBacklogs}
                    onChange={(e) => setFilterMaxBacklogs(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="border border-primary/20 bg-primary/5 p-3 rounded-lg space-y-1">
                <label className="text-xs font-bold text-primary uppercase block">Allow Special Concern / Override Rolls</label>
                <p className="text-[11px] text-muted-foreground">Enter Roll Numbers separated by commas to allow without eligibility checks (e.g. 21A91A0501, 21A91A0502)</p>
                <input
                  type="text"
                  placeholder="Roll Numbers..."
                  value={filterSpecialConcerns}
                  onChange={(e) => setFilterSpecialConcerns(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-mono outline-none transition focus:border-ring"
                />
              </div>

              <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3.5 text-center">
                <div className="text-xs text-muted-foreground">Students matching eligibility:</div>
                <div className="mt-1 text-2xl font-black text-primary">
                  {filteredCount}
                  <span className="text-sm font-medium text-muted-foreground ml-1">
                    / {selectedSubmissions.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="h-10 rounded-lg border border-input px-4 text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDownloadFiltered(selectedForm.id)}
                className="h-10 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-pop hover:opacity-95"
              >
                Download Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {previewForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewForm(null) }}
        >
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto card-surface p-6 shadow-pop animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setPreviewForm(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mb-6 border-b border-border pb-4">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2 ${statusColors[previewForm.status]}`}>
                {previewForm.status}
              </span>
              <h2 className="text-xl font-bold text-foreground">{previewForm.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Type: <span className="font-semibold text-foreground">{previewForm.type}</span> · Form ID: <span className="font-mono">{previewForm.id}</span> · Created: {previewForm.created}
              </p>
            </div>

            {/* Dates / Timeline */}
            <div className="grid gap-4 sm:grid-cols-2 bg-muted/20 p-4 rounded-xl border border-border/50 mb-6 text-xs">
              <div>
                <span className="text-muted-foreground font-semibold uppercase block mb-1">Start Date & Time</span>
                <span className="text-foreground font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> {previewForm.startDate} at {previewForm.startTime || '09:00'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold uppercase block mb-1">Close Date & Time</span>
                <span className="text-foreground font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> {previewForm.endDate} at {previewForm.endTime || '18:00'}
                </span>
              </div>
            </div>

            {/* Associated Company details if hasCompanyDrive is true */}
            {previewForm.hasCompanyDrive && (
              <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4" /> Associated Company Drive Details
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Company Name:</span>{' '}
                    <span className="font-semibold text-foreground">{previewForm.companyName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sector:</span>{' '}
                    <span className="font-semibold text-foreground">{previewForm.companySector}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>{' '}
                    <span className="font-semibold text-foreground">{previewForm.companyCategory}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>{' '}
                    <span className="font-semibold text-foreground">{previewForm.companyLocation}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Drive Mode:</span>{' '}
                    <span className="font-semibold text-foreground">{previewForm.companyDriveMode}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Job Type / Sector:</span>{' '}
                    <span className="font-semibold text-foreground">{previewForm.companyJobType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Package Range:</span>{' '}
                    <span className="font-semibold text-foreground">
                      ₹ {previewForm.companyPkgMin}–{previewForm.companyPkgMax} LPA
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Academic Year:</span>{' '}
                    <span className="font-semibold text-foreground">{previewForm.companyAcademicYear}</span>
                  </div>
                  {previewForm.companyRemarks && (
                    <div className="sm:col-span-2 mt-1">
                      <span className="text-muted-foreground">Remarks / Eligibility:</span>{' '}
                      <span className="text-foreground">{previewForm.companyRemarks}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Questions / Fields configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Form Questions & Fields</h3>
              <div className="space-y-3">
                {previewForm.fields.map((field, idx) => (
                  <div key={field.id} className="rounded-xl border border-border bg-muted/10 p-4 text-xs">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-semibold text-muted-foreground mr-1.5">Q{idx + 1}.</span>
                        <span className="font-bold text-foreground text-sm">{field.label}</span>
                        {field.required && <span className="ml-1 text-destructive font-bold">*</span>}
                      </div>
                      <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                        {field.type}
                      </span>
                    </div>

                    {field.placeholder && (
                      <div className="text-muted-foreground mt-1">
                        <span className="font-semibold">Placeholder:</span> <span className="italic">"{field.placeholder}"</span>
                      </div>
                    )}

                    {field.options && field.options.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                        <span className="text-muted-foreground font-semibold mr-1">Options:</span>
                        {field.options.map((opt) => (
                          <span key={opt} className="rounded-full bg-muted/60 border border-border px-2 py-0.5 text-[10px] font-medium text-foreground">
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Response Validation constraints */}
                    {(field.minValue !== undefined || field.minLength !== undefined || field.pattern !== undefined) && (
                      <div className="mt-2.5 border-t border-dashed border-border/60 pt-2 text-[11px]">
                        <div className="font-semibold text-primary mb-1">Response Validation Rules:</div>
                        <div className="grid gap-1.5 sm:grid-cols-2 text-muted-foreground">
                          {field.minValue && (
                            <div>
                              Min Value: <span className="font-semibold text-foreground">{field.minValue}</span>
                            </div>
                          )}
                          {field.maxValue && (
                            <div>
                              Max Value: <span className="font-semibold text-foreground">{field.maxValue}</span>
                            </div>
                          )}
                          {field.minLength && (
                            <div>
                              Min Length: <span className="font-semibold text-foreground">{field.minLength}</span>
                            </div>
                          )}
                          {field.maxLength && (
                            <div>
                              Max Length: <span className="font-semibold text-foreground">{field.maxLength}</span>
                            </div>
                          )}
                          {field.pattern && (
                            <div className="sm:col-span-2">
                              Pattern (Regex): <span className="font-mono text-foreground">{field.pattern}</span>
                            </div>
                          )}
                          {field.customErrorMessage && (
                            <div className="sm:col-span-2 italic text-destructive/80">
                              Error message: "{field.customErrorMessage}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setPreviewForm(null)}
                className="h-10 rounded-lg border border-input px-5 text-sm font-semibold hover:bg-muted"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetForm = previewForm;
                  setPreviewForm(null);
                  openEditModal(targetForm.id);
                }}
                className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
              >
                Edit Form
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
