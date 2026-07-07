import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import {
  AlertCircle,
  Check,
  Download,
  FileSpreadsheet,
  Filter,
  Columns,
  Search,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react'
import {
  loadMasterRows,
  saveMasterRows,
  loadMasterHistory,
  saveMasterHistory,
  type MasterStudentRow,
  type UploadHistoryEntry,
  useStoreState,
} from '../../lib/placeproStore'
import { getShortBranchName, getAllShortBranches } from '../../lib/branchUtils'

interface StudentRecord {
  id: string
  name: string
  email: string
  phone: string
  branch: string
  year: number
  cgpa: string
  gender: string
  state: string
  backlogs: string
}

type ParsedMasterRow = MasterStudentRow

type FilterOperator = '>=' | '<=' | '>' | '<' | '='



const masterFields = [
  'ROLL NUMBER',
  'FIRST NAME',
  'LAST NAME',
  'FULL NAME',
  'MAIL ID',
  'ALTERNATE MAIL ID',
  'PHONE NUMBER',
  'ALTERNATE PHONE NUMBER',
  'AADHAR NUMBER',
  'GENDER',
  'COUNTRY',
  'STATE',
  'CITY',
  'BRANCH',
  'DATE OF BIRTH',
  '10TH',
  '10TH YOP',
  '10TH BOARD',
  '12TH',
  '12TH YOP',
  '12TH BOARD',
  'COLLEGE NAME',
  'B.TECH CGPA',
  'B.TECH YOP',
  'ANY ACTIVE BACKLOGS',
  'NO OF BACKLOGS',
] as const

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function formatCellValue(value: unknown) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  return value || '-'
}

function mapParsedRowToStudent(row: ParsedMasterRow): StudentRecord {
  const fullName =
    row.fullName || [row.firstName, row.lastName].filter(Boolean).join(' ').trim()
  const graduationYear = Number.parseInt(row.btechYop, 10)

  return {
    id: row.rollNumber || '-',
    name: fullName || '-',
    email: row.mailId || '-',
    phone: formatPhoneNumber(row.phoneNumber),
    branch: getShortBranchName(row.branch || '-'),
    year: Number.isNaN(graduationYear) ? new Date().getFullYear() : graduationYear,
    cgpa: row.btechCgpa || '0',
    gender: row.gender || '-',
    state: row.state || '-',
    backlogs: row.noOfBacklogs || row.activeBacklogs || '0',
  }
}

function parseWorkbookRows(fileData: ArrayBuffer) {
  const workbook = XLSX.read(fileData, { type: 'array', cellDates: false })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]

  if (!sheet) {
    throw new Error('The workbook does not contain a readable worksheet.')
  }

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    raw: false,
    blankrows: false,
    defval: '',
  })

  if (rows.length === 0) {
    throw new Error('The selected worksheet is empty.')
  }

  const [headerRow, ...dataRows] = rows
  const headers = headerRow.map((item) => normalizeHeader(item))
  // Allow upload even if some headers are missing (fields are not mandatory)

  const headerIndex = new Map(headers.map((header, index) => [header, index]))

  const parsedRows: ParsedMasterRow[] = dataRows
    .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row) => {
      const getValue = (header: (typeof masterFields)[number]) => {
        const index = headerIndex.get(header)
        return formatCellValue(index === undefined ? '' : row[index])
      }

      return {
        rollNumber: getValue('ROLL NUMBER'),
        firstName: getValue('FIRST NAME'),
        lastName: getValue('LAST NAME'),
        fullName: getValue('FULL NAME'),
        mailId: getValue('MAIL ID'),
        alternateMailId: getValue('ALTERNATE MAIL ID'),
        phoneNumber: getValue('PHONE NUMBER'),
        alternatePhoneNumber: getValue('ALTERNATE PHONE NUMBER'),
        aadharNumber: getValue('AADHAR NUMBER'),
        gender: getValue('GENDER'),
        country: getValue('COUNTRY'),
        state: getValue('STATE'),
        city: getValue('CITY'),
        branch: getValue('BRANCH'),
        dateOfBirth: getValue('DATE OF BIRTH'),
        tenthPercentage: getValue('10TH'),
        tenthYop: getValue('10TH YOP'),
        tenthBoard: getValue('10TH BOARD'),
        twelfthPercentage: getValue('12TH'),
        twelfthYop: getValue('12TH YOP'),
        twelfthBoard: getValue('12TH BOARD'),
        collegeName: getValue('COLLEGE NAME'),
        btechCgpa: getValue('B.TECH CGPA'),
        btechYop: getValue('B.TECH YOP'),
        activeBacklogs: getValue('ANY ACTIVE BACKLOGS'),
        noOfBacklogs: getValue('NO OF BACKLOGS'),
      }
    })

  if (parsedRows.length === 0) {
    throw new Error('No student rows were found after the header row.')
  }

  return parsedRows
}

function compareNumber(actual: number, operator: FilterOperator, target: number) {
  switch (operator) {
    case '>':
      return actual > target
    case '<':
      return actual < target
    case '>=':
      return actual >= target
    case '<=':
      return actual <= target
    case '=':
      return actual === target
    default:
      return true
  }
}

export const ELIGIBILITY_COLUMNS = [
  { key: 'rollNumber', label: 'Roll Number', default: true },
  { key: 'fullName', label: 'Full Name', default: true },
  { key: 'firstName', label: 'First Name', default: false },
  { key: 'lastName', label: 'Last Name', default: false },
  { key: 'mailId', label: 'Mail ID', default: true },
  { key: 'alternateMailId', label: 'Alternate Mail ID', default: false },
  { key: 'phoneNumber', label: 'Phone Number', default: true },
  { key: 'alternatePhoneNumber', label: 'Alternate Phone Number', default: false },
  { key: 'aadharNumber', label: 'Aadhar Number', default: false },
  { key: 'gender', label: 'Gender', default: false },
  { key: 'country', label: 'Country', default: false },
  { key: 'state', label: 'State', default: false },
  { key: 'city', label: 'City', default: false },
  { key: 'branch', label: 'Branch', default: true },
  { key: 'dateOfBirth', label: 'Date of Birth', default: false },
  { key: 'tenthPercentage', label: '10th %', default: true },
  { key: 'tenthYop', label: '10th YOP', default: false },
  { key: 'tenthBoard', label: '10th Board', default: false },
  { key: 'twelfthPercentage', label: '12th %', default: true },
  { key: 'twelfthYop', label: '12th YOP', default: false },
  { key: 'twelfthBoard', label: '12th Board', default: false },
  { key: 'collegeName', label: 'College Name', default: false },
  { key: 'btechCgpa', label: 'B.Tech CGPA', default: true },
  { key: 'btechYop', label: 'B.Tech YOP', default: false },
  { key: 'activeBacklogs', label: 'Any Active Backlogs', default: false },
  { key: 'noOfBacklogs', label: 'No. of Backlogs', default: true },
] as const

export function AdminStudentsPage() {
  const [activeTab, setActiveTab] = useState<
    'records' | 'upload' | 'history' | 'eligibility'
  >('records')
  const masterRows = useStoreState(loadMasterRows) ?? []
  const historyList = useStoreState(loadMasterHistory) ?? []
  const [searchParams] = useSearchParams()
  const searchParam = searchParams.get('search')
  const [search, setSearch] = useState(() => searchParam || '')

  useEffect(() => {
    if (searchParam !== null) {
      setSearch(searchParam)
    }
  }, [searchParam])
  const [filterBranch, setFilterBranch] = useState('All')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<ParsedMasterRow[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newRoll, setNewRoll] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newBranch, setNewBranch] = useState('CSE')
  const [newCgpa, setNewCgpa] = useState('')
  const [newGender, setNewGender] = useState('Male')
  const [newState, setNewState] = useState('Telangana')
  const [newBacklogs, setNewBacklogs] = useState('0')

  const [tenthOperator, setTenthOperator] = useState<FilterOperator>('>=')
  const [tenthValue, setTenthValue] = useState('60')
  const [twelfthOperator, setTwelfthOperator] = useState<FilterOperator>('>=')
  const [twelfthValue, setTwelfthValue] = useState('60')
  const [cgpaOperator, setCgpaOperator] = useState<FilterOperator>('>=')
  const [cgpaValue, setCgpaValue] = useState('7')
  const [backlogOperator, setBacklogOperator] = useState<FilterOperator>('<=')
  const [backlogValue, setBacklogValue] = useState('0')
  const [eligibilityBranch, setEligibilityBranch] = useState('All')
  const [showColSelector, setShowColSelector] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() =>
    ELIGIBILITY_COLUMNS.filter((c) => c.default).map((c) => c.key),
  )

  const studentsList = useMemo(
    () => masterRows.map(mapParsedRowToStudent),
    [masterRows],
  )



  const branches = useMemo(
    () => ['All', ...new Set(studentsList.map((student) => student.branch))],
    [studentsList],
  )

  const filtered = studentsList.filter((student) => {
    const matchSearch =
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.id.toLowerCase().includes(search.toLowerCase()) ||
      student.branch.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase()) ||
      student.phone.includes(search)
    const matchBranch = filterBranch === 'All' || student.branch === filterBranch
    return matchSearch && matchBranch
  })

  function handleDeleteStudent(rollNumber: string) {
    const student = masterRows.find((r) => r.rollNumber === rollNumber)
    const displayName = student ? (student.fullName || `${student.firstName} ${student.lastName}`.trim()) : rollNumber
    if (!confirm(`Are you sure you want to delete student "${displayName}" (${rollNumber})?`)) return
    saveMasterRows(masterRows.filter((r) => r.rollNumber !== rollNumber))
    showToast(`Deleted student ${displayName} (${rollNumber}).`)
  }

  const eligibilityRows = useMemo(() => {
    return masterRows.filter((row) => {
      const tenth = Number.parseFloat(row.tenthPercentage || '0')
      const twelfth = Number.parseFloat(row.twelfthPercentage || '0')
      const cgpa = Number.parseFloat(row.btechCgpa || '0')
      const backlogs = Number.parseInt(row.noOfBacklogs || row.activeBacklogs || '0', 10)
      const branchMatch =
        eligibilityBranch === 'All' || row.branch === eligibilityBranch

      return (
        branchMatch &&
        compareNumber(tenth, tenthOperator, Number.parseFloat(tenthValue || '0')) &&
        compareNumber(
          twelfth,
          twelfthOperator,
          Number.parseFloat(twelfthValue || '0'),
        ) &&
        compareNumber(cgpa, cgpaOperator, Number.parseFloat(cgpaValue || '0')) &&
        compareNumber(
          Number.isNaN(backlogs) ? 0 : backlogs,
          backlogOperator,
          Number.parseFloat(backlogValue || '0'),
        )
      )
    })
  }, [
    backlogOperator,
    backlogValue,
    cgpaOperator,
    cgpaValue,
    eligibilityBranch,
    masterRows,
    tenthOperator,
    tenthValue,
    twelfthOperator,
    twelfthValue,
  ])

  function showToast(message: string) {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      setUploadError('Invalid format. Please select an .xls or .xlsx file.')
      setShowPreview(false)
      setPreviewRows([])
      showToast('Invalid format. Please select an Excel sheet.')
      return
    }

    try {
      setIsParsing(true)
      setUploadError(null)
      const buffer = await file.arrayBuffer()
      const rows = parseWorkbookRows(buffer)
      setSelectedFile(file.name)
      setPreviewRows(rows)
      setShowPreview(true)
      showToast(
        `Spreadsheet loaded. Previewing ${rows.length} records from the uploaded file.`,
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to parse the uploaded workbook.'
      setUploadError(message)
      setSelectedFile(file.name)
      setPreviewRows([])
      setShowPreview(false)
      showToast('Unable to preview workbook. Please check the required columns.')
    } finally {
      setIsParsing(false)
      event.target.value = ''
    }
  }

  function confirmUpload() {
    if (!selectedFile || previewRows.length === 0) return

    saveMasterRows(previewRows)

    const newLog: UploadHistoryEntry = {
      fileName: selectedFile,
      uploadDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      recordsCount: previewRows.length,
      uploadedBy: 'Admin User',
      rows: previewRows,
    }

    saveMasterHistory([newLog, ...historyList])
    setSelectedFile(null)
    setPreviewRows([])
    setShowPreview(false)
    setUploadError(null)
    setActiveTab('records')
    showToast('Master student database updated from the uploaded Excel file.')
  }

  function downloadHistoryExcel(entry: UploadHistoryEntry) {
    if (!entry.rows || entry.rows.length === 0) {
      showToast(`No records stored for history file: ${entry.fileName}`)
      return
    }
    const worksheet = XLSX.utils.json_to_sheet(entry.rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Students')
    XLSX.writeFile(workbook, entry.fileName)
    showToast(`Downloaded history file: ${entry.fileName}`)
  }

  function triggerExport() {
    const exportRows = masterRows.map((row) => ({
      'ROLL NUMBER': row.rollNumber,
      'FULL NAME': row.fullName || [row.firstName, row.lastName].filter(Boolean).join(' '),
      'MAIL ID': row.mailId,
      'PHONE NUMBER': row.phoneNumber,
      BRANCH: row.branch,
      '10TH': row.tenthPercentage,
      '12TH': row.twelfthPercentage,
      'B.TECH CGPA': row.btechCgpa,
      'NO OF BACKLOGS': row.noOfBacklogs,
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students')
    XLSX.writeFile(workbook, 'placepro-students-master-export.xlsx')
    showToast('Downloaded current master student database.')
  }

  function downloadEligibilityExport() {
    const activeCols = ELIGIBILITY_COLUMNS.filter((col) => selectedColumns.includes(col.key))
    if (activeCols.length === 0) {
      showToast('Please select at least one column to download.')
      return
    }

    const exportRows = eligibilityRows.map((row) => {
      const exportRow: Record<string, any> = {}
      activeCols.forEach((col) => {
        let val: any = row[col.key as keyof MasterStudentRow]
        if (col.key === 'fullName') {
          val = row.fullName || [row.firstName, row.lastName].filter(Boolean).join(' ')
        } else if (col.key === 'noOfBacklogs') {
          val = row.noOfBacklogs || row.activeBacklogs || '0'
        }
        exportRow[col.label.toUpperCase()] = val || ''
      })
      return exportRow
    })

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Eligible Students')
    XLSX.writeFile(workbook, 'placepro-eligibility-filter.xlsx')
    showToast('Downloaded eligibility-filtered Excel file.')
  }

  function handleManualAdd(event: React.FormEvent) {
    event.preventDefault()
    if (!newRoll || !newName || !newCgpa) return

    const nameParts = newName.trim().split(/\s+/)
    const firstName = nameParts[0] ?? newName
    const lastName = nameParts.slice(1).join(' ')

    const newRow: ParsedMasterRow = {
      rollNumber: newRoll,
      firstName,
      lastName,
      fullName: newName,
      mailId: newEmail || `${newName.toLowerCase().replace(/\s+/g, '')}@college.edu`,
      alternateMailId: '',
      phoneNumber: newPhone || '9876500000',
      alternatePhoneNumber: '',
      aadharNumber: '',
      gender: newGender,
      country: 'India',
      state: newState,
      city: '',
      branch: newBranch,
      dateOfBirth: '',
      tenthPercentage: '0',
      tenthYop: '',
      tenthBoard: '',
      twelfthPercentage: '0',
      twelfthYop: '',
      twelfthBoard: '',
      collegeName: 'PlacePro College',
      btechCgpa: Number.parseFloat(newCgpa).toFixed(2),
      btechYop: '2026',
      activeBacklogs: newBacklogs === '0' ? 'No' : 'Yes',
      noOfBacklogs: newBacklogs,
    }

    saveMasterRows([newRow, ...masterRows])
    setIsAddOpen(false)
    setNewRoll('')
    setNewName('')
    setNewEmail('')
    setNewPhone('')
    setNewCgpa('')
    showToast(`Added student ${newName} manually.`)
  }

  return (
    <>
      {toastMessage && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-pop animate-in fade-in duration-300">
          {toastMessage}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the master student database, upload Excel master sheets, and
            run eligibility filtering from the same source data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={triggerExport}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted"
          >
            <Download className="h-4 w-4" /> Export database
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
          >
            <UserPlus className="h-4 w-4" /> Add student
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-4 border-b border-border text-sm font-semibold">
        {[
          ['records', 'Student Records'],
          ['upload', 'Upload Master Data'],
          ['history', 'Upload History'],
          ['eligibility', 'Eligibility'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() =>
              setActiveTab(
                key as 'records' | 'upload' | 'history' | 'eligibility',
              )
            }
            className={`relative pb-3 transition-colors ${
              activeTab === key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {activeTab === key && (
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'records' && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search by roll number, name, branch, email, or phone..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={filterBranch}
              onChange={(event) => setFilterBranch(event.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
            >
              {branches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch === 'All' ? 'All branches' : branch}
                </option>
              ))}
            </select>
          </div>

          <div className="card-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Roll Number</th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email / Phone</th>
                    <th className="px-5 py-3 font-medium">Branch</th>
                    <th className="px-5 py-3 font-medium">CGPA</th>
                    <th className="px-5 py-3 font-medium">Backlogs</th>
                    <th className="px-5 py-3 font-medium">Gender</th>
                    <th className="px-5 py-3 font-medium">State</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs">{student.id}</td>
                      <td className="px-5 py-3 font-semibold">{student.name}</td>
                      <td className="px-5 py-3">
                        <div className="text-xs">{student.email}</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {student.phone}
                        </div>
                      </td>
                      <td className="px-5 py-3">{student.branch}</td>
                      <td className="px-5 py-3 font-mono">{student.cgpa}</td>
                      <td className="px-5 py-3 font-mono text-xs">{student.backlogs}</td>
                      <td className="px-5 py-3">{student.gender}</td>
                      <td className="px-5 py-3">{student.state}</td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer transition"
                          title={`Delete ${student.name}`}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-muted-foreground">
                        No students found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Showing {filtered.length} of {studentsList.length} students
          </div>
        </>
      )}

      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="card-surface space-y-4 p-5 md:col-span-2 md:p-6">
              <h2 className="text-lg font-bold text-foreground">
                Upload spreadsheet records
              </h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Select a spreadsheet document (`.xls`, `.xlsx`) to populate the
                placement database. The preview below is generated from the actual
                uploaded workbook, and confirming the upload replaces the current
                master student list.
              </p>

              <label className="flex h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border transition-colors hover:bg-muted/30">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="mt-3 text-sm font-semibold text-foreground">
                  Select Spreadsheet File
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  Accepts .xls and .xlsx up to 10MB
                </span>
                <input
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              {selectedFile && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="flex-1 font-mono text-sm">{selectedFile}</span>
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      setPreviewRows([])
                      setShowPreview(false)
                      setUploadError(null)
                    }}
                    className="rounded p-1 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {uploadError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="h-4 w-4" /> Upload validation failed
                  </div>
                  <div className="mt-1 text-xs">{uploadError}</div>
                </div>
              )}
            </div>

            <div className="card-surface h-fit space-y-3 p-5 md:p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Required Fields (26 Fields)
              </h3>
              <div className="h-64 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/10 p-3 font-mono text-xs text-muted-foreground">
                {masterFields.map((field, index) => (
                  <div key={field} className="flex gap-2">
                    <span className="font-bold text-primary">{index + 1}.</span>
                    <span>{field}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {showPreview && (
            <div className="card-surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h3 className="font-bold text-foreground">Preview Data</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Showing {previewRows.length} parsed rows from the uploaded
                    workbook. These exact rows will replace the current master
                    database on confirmation.
                  </p>
                </div>
                <button
                  onClick={confirmUpload}
                  disabled={isParsing || previewRows.length === 0}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-success px-4 text-sm font-semibold text-success-foreground shadow-pop hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check className="h-4 w-4" /> Confirm Upload
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Roll Number</th>
                      <th className="px-5 py-3 font-medium">Full Name</th>
                      <th className="px-5 py-3 font-medium">Mail ID</th>
                      <th className="px-5 py-3 font-medium">Phone Number</th>
                      <th className="px-5 py-3 font-medium">Branch</th>
                      <th className="px-5 py-3 font-medium">B.Tech CGPA</th>
                      <th className="px-5 py-3 font-medium">Active Backlogs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr
                        key={`${row.rollNumber}-${row.mailId}`}
                        className="border-b border-border last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-5 py-3 font-mono text-xs">
                          {row.rollNumber}
                        </td>
                        <td className="px-5 py-3 font-semibold">
                          {row.fullName ||
                            [row.firstName, row.lastName].filter(Boolean).join(' ')}
                        </td>
                        <td className="px-5 py-3">{row.mailId}</td>
                        <td className="px-5 py-3 font-mono">{row.phoneNumber}</td>
                        <td className="px-5 py-3">{row.branch}</td>
                        <td className="px-5 py-3 font-mono">{row.btechCgpa}</td>
                        <td className="px-5 py-3 font-mono text-xs">
                          {row.noOfBacklogs || row.activeBacklogs || '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">File Name</th>
                  <th className="px-5 py-3 font-medium">Upload Date</th>
                  <th className="px-5 py-3 font-medium">Records Count</th>
                  <th className="px-5 py-3 font-medium">Uploaded By</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((row) => (
                  <tr
                    key={row.fileName + row.uploadDate}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="flex items-center gap-2 px-5 py-3 font-medium">
                      <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
                      {row.fileName}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {row.uploadDate}
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      {row.recordsCount} records
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {row.uploadedBy}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {row.rows && row.rows.length > 0 ? (
                        <button
                          onClick={() => downloadHistoryExcel(row)}
                          className="inline-flex h-8 items-center gap-1 text-xs font-semibold text-primary border border-input rounded px-2 hover:bg-muted cursor-pointer"
                        >
                          <Download className="h-3 w-3" /> Re-download
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No source stored</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'eligibility' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
            <div className="card-surface p-5 md:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <h2 className="font-bold text-foreground">Eligibility Filters</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Branch
                  </label>
                  <select
                    value={eligibilityBranch}
                    onChange={(event) => setEligibilityBranch(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none"
                  >
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch === 'All' ? 'All branches' : branch}
                      </option>
                    ))}
                  </select>
                </div>

                {[
                  ['10th Percentage', tenthOperator, setTenthOperator, tenthValue, setTenthValue],
                  [
                    '12th Percentage',
                    twelfthOperator,
                    setTwelfthOperator,
                    twelfthValue,
                    setTwelfthValue,
                  ],
                  ['B.Tech CGPA', cgpaOperator, setCgpaOperator, cgpaValue, setCgpaValue],
                  [
                    'No. of Backlogs',
                    backlogOperator,
                    setBacklogOperator,
                    backlogValue,
                    setBacklogValue,
                  ],
                ].map(([label, operator, setOperator, value, setValue]) => (
                  <div key={label as string} className="grid grid-cols-[110px,1fr] gap-2">
                    <div className="col-span-2 text-xs font-semibold uppercase text-muted-foreground">
                      {label as string}
                    </div>
                    <select
                      value={operator as string}
                      onChange={(event) =>
                        (setOperator as React.Dispatch<React.SetStateAction<FilterOperator>>)(
                          event.target.value as FilterOperator,
                        )
                      }
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                    >
                      <option value=">=">{'>='}</option>
                      <option value="<=">{'<='}</option>
                      <option value=">">{'>'}</option>
                      <option value="<">{'<'}</option>
                      <option value="=">{'='}</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={value as string}
                      onChange={(event) =>
                        (setValue as React.Dispatch<React.SetStateAction<string>>)(
                          event.target.value,
                        )
                      }
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="card-surface overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-foreground">Eligible Students</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {eligibilityRows.length} students match the current main-data filters.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowColSelector(!showColSelector)}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-3 text-sm font-semibold hover:bg-muted cursor-pointer"
                    >
                      <Columns className="h-4 w-4" /> Columns
                    </button>
                    <button
                      type="button"
                      onClick={downloadEligibilityExport}
                      disabled={eligibilityRows.length === 0 || selectedColumns.length === 0}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Download className="h-4 w-4" /> Download Filter Excel
                    </button>
                  </div>
                </div>

                {/* Collapsible Column Selector */}
                {showColSelector && (
                  <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
                      <span>Select columns to display & download</span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedColumns(ELIGIBILITY_COLUMNS.map((c) => c.key))}
                          className="text-primary hover:underline font-bold normal-case cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedColumns(ELIGIBILITY_COLUMNS.filter((c) => c.default).map((c) => c.key))}
                          className="text-primary hover:underline font-bold normal-case cursor-pointer"
                        >
                          Reset Defaults
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {ELIGIBILITY_COLUMNS.map((col) => (
                        <label
                          key={col.key}
                          className="flex cursor-pointer items-center gap-2 rounded border border-border bg-background p-2 text-xs hover:bg-muted/40 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedColumns.includes(col.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedColumns([...selectedColumns, col.key])
                              } else {
                                setSelectedColumns(selectedColumns.filter((k) => k !== col.key))
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
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      {ELIGIBILITY_COLUMNS.filter((col) => selectedColumns.includes(col.key)).map((col) => (
                        <th key={col.key} className="px-5 py-3 font-medium">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {eligibilityRows.map((row) => (
                      <tr
                        key={row.rollNumber}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        {ELIGIBILITY_COLUMNS.filter((col) => selectedColumns.includes(col.key)).map((col) => {
                          const val = row[col.key as keyof MasterStudentRow]

                          if (col.key === 'rollNumber') {
                            return (
                              <td key={col.key} className="px-5 py-3 font-mono text-xs">
                                {val}
                              </td>
                            )
                          }
                          if (col.key === 'fullName') {
                            const nameVal = row.fullName || [row.firstName, row.lastName].filter(Boolean).join(' ')
                            return (
                              <td key={col.key} className="px-5 py-3 font-semibold">
                                {nameVal}
                              </td>
                            )
                          }
                          if (col.key === 'noOfBacklogs') {
                            const backVal = row.noOfBacklogs || row.activeBacklogs || '0'
                            return (
                              <td key={col.key} className="px-5 py-3 font-mono">
                                {backVal}
                              </td>
                            )
                          }
                          if (col.key === 'tenthPercentage' || col.key === 'twelfthPercentage' || col.key === 'btechCgpa') {
                            return (
                              <td key={col.key} className="px-5 py-3 font-mono">
                                {val}
                              </td>
                            )
                          }
                          return (
                            <td key={col.key} className="px-5 py-3">
                              {val || '-'}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    {eligibilityRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={selectedColumns.length || 1}
                          className="px-5 py-8 text-center text-muted-foreground"
                        >
                          No students match the current eligibility filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto card-surface p-6 shadow-pop animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-bold text-foreground">
              Add Student Manually
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Manually insert a verified student into the registry database.
            </p>

            <form onSubmit={handleManualAdd} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE21099"
                    value={newRoll}
                    onChange={(event) => setNewRoll(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Mail ID
                </label>
                <input
                  type="email"
                  placeholder="e.g. priya.s@college.edu"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 98765"
                  value={newPhone}
                  onChange={(event) => setNewPhone(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Branch
                  </label>
                  <select
                    value={newBranch}
                    onChange={(event) => setNewBranch(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring text-foreground bg-card"
                  >
                    {getAllShortBranches(studentsList.map((s) => s.branch)).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    B.Tech CGPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 8.45"
                    value={newCgpa}
                    onChange={(event) => setNewCgpa(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Gender
                  </label>
                  <select
                    value={newGender}
                    onChange={(event) => setNewGender(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    State
                  </label>
                  <input
                    type="text"
                    value={newState}
                    onChange={(event) => setNewState(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Backlogs
                  </label>
                  <input
                    type="number"
                    value={newBacklogs}
                    onChange={(event) => setNewBacklogs(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="h-10 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
