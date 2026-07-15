import { useState, useMemo } from 'react'
import {
  Download,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Filter,
  Users,
  Building2,
  Briefcase,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  loadMasterRows,
  loadCompanies,
  loadPlacements,
  useStoreState,
} from '../../lib/placeproStore'
import { useAcademicYear, getAcademicYearFromYop, normalizeAcademicYear, getAcademicYearFromDate } from '../../lib/AcademicYearContext'

type ReportType = 'students' | 'companies' | 'placements' | 'summary'
type ExportFormat = 'excel' | 'csv' | 'pdf'

function extractPackageLpa(packageLabel: string) {
  const match = String(packageLabel || '').match(/\d+(?:\.\d+)?/)
  return match ? parseFloat(match[0]) : Number.NaN
}

export function AdminReportsPage() {
  const { academicYears, selectedYear } = useAcademicYear()

  const [yearMode, setYearMode] = useState<'single' | 'multiple' | 'all'>('single')
  const [selectedReportYears, setSelectedReportYears] = useState<string[]>([selectedYear])
  const [reportType, setReportType] = useState<ReportType>('placements')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')

  const allStudents = useStoreState(loadMasterRows) ?? []
  const allCompanies = useStoreState(loadCompanies) ?? []
  const allPlacements = useStoreState(loadPlacements) ?? []

  const yearOptions = academicYears.map((y) => y.academic_year)

  const effectiveYears = useMemo(() => {
    if (yearMode === 'all') return yearOptions
    if (yearMode === 'single') return [selectedYear]
    return selectedReportYears
  }, [yearMode, selectedYear, selectedReportYears, yearOptions])

  const toggleReportYear = (year: string) => {
    setSelectedReportYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    )
  }

  // Filter data by selected years
  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      const studentYear = s.academicYear || getAcademicYearFromYop(s.btechYop)
      if (!effectiveYears.includes(studentYear)) return false
      if (branchFilter !== 'all' && s.branch !== branchFilter) return false
      return true
    })
  }, [allStudents, effectiveYears, branchFilter])

  const filteredCompanies = useMemo(() => {
    return allCompanies.filter((c) => {
      const companyYear = normalizeAcademicYear(c.academicYear)
      if (!effectiveYears.includes(companyYear)) return false
      if (companyFilter !== 'all' && c.name !== companyFilter) return false
      return true
    })
  }, [allCompanies, effectiveYears, companyFilter])

  const filteredPlacements = useMemo(() => {
    return allPlacements.filter((p) => {
      const placementYear = p.academicYear || getAcademicYearFromDate(p.date)
      if (!effectiveYears.includes(placementYear)) return false
      if (branchFilter !== 'all' && p.branch !== branchFilter) return false
      if (companyFilter !== 'all' && p.company !== companyFilter) return false
      return true
    })
  }, [allPlacements, effectiveYears, branchFilter, companyFilter])

  // Unique filters
  const branches = [...new Set(allStudents.map((s) => s.branch).filter(Boolean))].sort()
  const companyNames = [...new Set(allCompanies.map((c) => c.name).filter(Boolean))].sort()

  // Generate report data
  const reportData = useMemo(() => {
    switch (reportType) {
      case 'students':
        return filteredStudents.map((s) => ({
          'Roll Number': s.rollNumber,
          'Name': s.fullName || `${s.firstName} ${s.lastName}`,
          'Branch': s.branch,
          'Email': s.mailId,
          'Phone': s.phoneNumber,
          'CGPA': s.btechCgpa,
          'YOP': s.btechYop,
          'Academic Year': s.academicYear || getAcademicYearFromYop(s.btechYop),
        }))
      case 'companies':
        return filteredCompanies.map((c) => ({
          'Company': c.name,
          'Sector': c.sector,
          'Type': c.type,
          'Location': c.location,
          'Package': c.package,
          'Status': c.status,
          'Mode': c.mode,
          'Academic Year': c.academicYear,
        }))
      case 'placements':
        return filteredPlacements.map((p) => ({
          'Student': p.student,
          'Roll Number': p.id,
          'Branch': p.branch,
          'Company': p.company,
          'Role': p.role,
          'Package': p.package,
          'Date': p.date,
          'Type': p.type,
        }))
      case 'summary':
        return effectiveYears.map((year) => {
          const yearStudents = allStudents.filter((s) => (s.academicYear || getAcademicYearFromYop(s.btechYop)) === year)
          const yearPlacements = allPlacements.filter((p) => (p.academicYear || getAcademicYearFromDate(p.date)) === year)
          const yearCompanies = allCompanies.filter((c) => normalizeAcademicYear(c.academicYear) === year)

          let highest = 0, sum = 0, count = 0
          yearPlacements.forEach((p) => {
            const lpa = extractPackageLpa(p.package)
            if (!isNaN(lpa)) { if (lpa > highest) highest = lpa; sum += lpa; count++ }
          })

          return {
            'Academic Year': year,
            'Total Students': yearStudents.length,
            'Total Placed': yearPlacements.length,
            'Placement %': yearStudents.length > 0 ? `${Math.round((yearPlacements.length / yearStudents.length) * 100)}%` : '0%',
            'Companies': yearCompanies.length,
            'Highest Package (LPA)': highest || 'N/A',
            'Avg Package (LPA)': count > 0 ? (sum / count).toFixed(1) : 'N/A',
          }
        })
      default:
        return []
    }
  }, [reportType, filteredStudents, filteredCompanies, filteredPlacements, effectiveYears, allStudents, allPlacements, allCompanies])

  // Export functions
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(reportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, reportType)
    XLSX.writeFile(wb, `PlaceGO!-${reportType}-${effectiveYears.join('_')}.xlsx`)
  }

  const exportCSV = () => {
    if (reportData.length === 0) return
    const headers = Object.keys(reportData[0])
    const csvContent = [
      headers.join(','),
      ...reportData.map((row: any) => headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PlaceGO!-${reportType}-${effectiveYears.join('_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    if (reportData.length === 0) return
    const headers = Object.keys(reportData[0])
    const title = `PlaceGO! - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`
    const subtitle = `Academic Year(s): ${effectiveYears.join(', ')} | Generated: ${new Date().toLocaleDateString()}`

    // Build a printable HTML table
    let html = `<!DOCTYPE html><html><head><title>${title}</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; padding: 30px; color: #1a1a2e; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .sub { font-size: 12px; color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #1a1a2e; color: white; padding: 8px 6px; text-align: left; }
        td { padding: 6px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background: #f9fafb; }
        @media print { body { padding: 10px; } }
      </style></head><body>
      <h1>${title}</h1>
      <div class="sub">${subtitle}</div>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>`

    reportData.forEach((row: any) => {
      html += `<tr>${headers.map((h) => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`
    })

    html += '</tbody></table></body></html>'

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 500)
    }
  }

  const handleExport = (format: ExportFormat) => {
    if (format === 'excel') exportExcel()
    else if (format === 'csv') exportCSV()
    else exportPDF()
  }

  const reportTypeConfig = {
    students: { icon: <Users className="h-4 w-4" />, label: 'Students Report', color: 'bg-blue-100 text-blue-700' },
    companies: { icon: <Building2 className="h-4 w-4" />, label: 'Companies Report', color: 'bg-purple-100 text-purple-700' },
    placements: { icon: <Briefcase className="h-4 w-4" />, label: 'Placements Report', color: 'bg-emerald-100 text-emerald-700' },
    summary: { icon: <FileBarChart className="h-4 w-4" />, label: 'Summary Report', color: 'bg-amber-100 text-amber-700' },
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate and export placement reports across academic years
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="card-surface p-5 mb-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Year Mode */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Year Scope</label>
            <select
              value={yearMode}
              onChange={(e) => setYearMode(e.target.value as any)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
            >
              <option value="single">Selected Year ({selectedYear})</option>
              <option value="multiple">Multiple Years</option>
              <option value="all">All Years</option>
            </select>
          </div>

          {/* Report Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
            >
              <option value="placements">📋 Placements</option>
              <option value="students">👥 Students</option>
              <option value="companies">🏢 Companies</option>
              <option value="summary">📊 Year Summary</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Company Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Company</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Companies</option>
              {companyNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Multiple year selection */}
        {yearMode === 'multiple' && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Select Years</div>
            <div className="flex flex-wrap gap-2">
              {yearOptions.map((y) => (
                <button
                  key={y}
                  onClick={() => toggleReportYear(y)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    selectedReportYears.includes(y)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report Summary + Export */}
      <div className="card-surface p-5 mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${reportTypeConfig[reportType].color}`}>
              {reportTypeConfig[reportType].icon}
            </div>
            <div>
              <div className="font-semibold">{reportTypeConfig[reportType].label}</div>
              <div className="text-xs text-muted-foreground">
                {reportData.length} records · Years: {effectiveYears.join(', ')}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleExport('excel')}
              disabled={reportData.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-40"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={reportData.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-40"
            >
              <FileText className="h-4 w-4" /> CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={reportData.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-40"
            >
              <Download className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Data Preview Table */}
      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          {reportData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              <div className="text-center">
                <Filter className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
                <p>No records found for the selected filters</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {Object.keys(reportData[0]).map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.slice(0, 50).map((row: any, i: number) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/20 transition">
                    {Object.values(row).map((val: any, j: number) => (
                      <td key={j} className="px-4 py-2.5 whitespace-nowrap">
                        {val ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reportData.length > 50 && (
            <div className="p-3 text-center text-xs text-muted-foreground border-t border-border">
              Showing first 50 of {reportData.length} records. Export to see all.
            </div>
          )}
        </div>
      </div>
    </>
  )
}

