import { useState, useMemo } from 'react'
import { Download, FileText, Printer, Search, Eye, X, Bot, Sparkles } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import * as XLSX from 'xlsx'
import {
  loadMasterRows,
  loadCompanies,
  loadPlacements,
  type MasterStudentRow,
} from '../../lib/placeproStore'
import { getBranchAbbreviation } from '../../lib/utils'

function masterName(row: MasterStudentRow) {
  return row.fullName || [row.firstName, row.lastName].filter(Boolean).join(' ').trim()
}

function masterBacklogs(row: MasterStudentRow) {
  return (row.noOfBacklogs || row.activeBacklogs || '0').trim()
}

export function AdminReportsPage() {
  const masterRows = useMemo(() => loadMasterRows() ?? [], [])
  const companiesList = useMemo(() => loadCompanies() ?? [], [])
  const placementsList = useMemo(() => loadPlacements() ?? [], [])

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Report preview dialog state
  const [previewReport, setPreviewReport] = useState<{ id: string; name: string; category: string; date: string; size: string; content: string } | null>(null)

  // AI report summary state
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)

  const categories = ['All', 'Students', 'Companies', 'TPO Dashboard', 'Placements']

  const avgPackage = useMemo(() => {
    if (placementsList.length === 0) return '0.0'
    const sum = placementsList.reduce((acc, p) => {
      const match = p.package.match(/(\d+(?:\.\d+)?)/)
      const num = match ? parseFloat(match[1]) : 0
      return acc + num
    }, 0)
    return (sum / placementsList.length).toFixed(1)
  }, [placementsList])

  const branchPlacement = useMemo(() => {
    const defaultBranches = ['CSE', 'IT', 'ECE', 'ME', 'EE', 'CE', 'CSE-ML', 'CSE-DS']
    const masterBranches = masterRows.map(r => getBranchAbbreviation(r.branch))
    const placementBranches = placementsList.map(p => getBranchAbbreviation(p.branch))
    const allBranches = Array.from(new Set([...defaultBranches, ...masterBranches, ...placementBranches])).filter(Boolean)

    return allBranches.map((br) => {
      const total = masterRows.filter(r => getBranchAbbreviation(r.branch) === br).length
      const placed = placementsList.filter(p => getBranchAbbreviation(p.branch) === br).length
      return {
        branch: br,
        placed,
        total,
      }
    })
  }, [masterRows, placementsList])

  const packageDistribution = useMemo(() => {
    let under5 = 0
    let range5to10 = 0
    let range10to20 = 0
    let range20to40 = 0
    let over40 = 0

    placementsList.forEach((p) => {
      const match = p.package.match(/(\d+(?:\.\d+)?)/)
      const pkg = match ? parseFloat(match[1]) : 0
      if (pkg < 5) under5++
      else if (pkg >= 5 && pkg < 10) range5to10++
      else if (pkg >= 10 && pkg < 20) range10to20++
      else if (pkg >= 20 && pkg < 40) range20to40++
      else if (pkg >= 40) over40++
    })

    const total = under5 + range5to10 + range10to20 + range20to40 + over40
    if (total === 0) {
      return []
    }

    return [
      { name: '< 5 LPA', value: under5, color: 'oklch(70% 0.18 30)' },
      { name: '5–10 LPA', value: range5to10, color: 'oklch(54.6% 0.215 262.88)' },
      { name: '10–20 LPA', value: range10to20, color: 'oklch(66% 0.16 152)' },
      { name: '20–40 LPA', value: range20to40, color: 'oklch(78% 0.15 75)' },
      { name: '> 40 LPA', value: over40, color: 'oklch(65% 0.2 320)' },
    ]
  }, [placementsList])

  const reportsList = useMemo(() => {
    return [
      {
        id: 'REP-01',
        name: 'Student Master Database Report',
        category: 'Students',
        date: new Date().toISOString().split('T')[0],
        size: `${((JSON.stringify(masterRows).length) / 1024).toFixed(1)} KB`,
        content: `Total Students registered in Master Database: ${masterRows.length}.\nBranches included: ${Array.from(new Set(masterRows.map(r => r.branch))).join(', ') || 'None'}.`
      },
      {
        id: 'REP-02',
        name: 'Recruitment Drives Report',
        category: 'Companies',
        date: new Date().toISOString().split('T')[0],
        size: `${((JSON.stringify(companiesList).length) / 1024).toFixed(1)} KB`,
        content: `Total Recruitment Drives registered: ${companiesList.length}.\nActive: ${companiesList.filter(c => c.status === 'Active').length}, Completed: ${companiesList.filter(c => c.status === 'Completed').length}, Upcoming: ${companiesList.filter(c => c.status === 'Upcoming').length}.\nSectors: ${Array.from(new Set(companiesList.map(c => c.sector))).join(', ') || 'None'}.`
      },
      {
        id: 'REP-03',
        name: 'TPO Dashboard Analytical Report',
        category: 'TPO Dashboard',
        date: new Date().toISOString().split('T')[0],
        size: '15.4 KB',
        content: `Total Drives: ${companiesList.length}.\nTotal Student Selections: ${placementsList.length}.\nAverage Placement Package: ₹ ${avgPackage} LPA.\nIT Companies Count: ${companiesList.filter(c => c.jobType === 'IT').length}, Non-IT Companies: ${companiesList.filter(c => c.jobType !== 'IT').length}.`
      },
      {
        id: 'REP-04',
        name: 'Placement Offers Repository Report',
        category: 'Placements',
        date: new Date().toISOString().split('T')[0],
        size: `${((JSON.stringify(placementsList).length) / 1024).toFixed(1)} KB`,
        content: `Total Official Placement Offers: ${placementsList.length}.\nOn-campus offers: ${placementsList.filter(p => p.type === 'On-campus').length}, Off-campus offers: ${placementsList.filter(p => p.type === 'Off-campus').length}.\nCompanies represented: ${Array.from(new Set(placementsList.map(p => p.company))).join(', ') || 'None'}.`
      }
    ]
  }, [masterRows, companiesList, placementsList, avgPackage])

  const filteredReports = useMemo(() => {
    return reportsList.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = filterCategory === 'All' || r.category === filterCategory
      return matchesSearch && matchesCategory
    })
  }, [reportsList, search, filterCategory])

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  function handleDownloadExcel(category: string) {
    let data: any[] = []
    let sheetName = ''

    if (category === 'Students') {
      data = masterRows.map(r => ({
        'Roll Number': r.rollNumber,
        'Name': masterName(r),
        'Email': r.mailId,
        'Phone': r.phoneNumber,
        'Branch': r.branch,
        'CGPA': r.btechCgpa,
        '10th %': r.tenthPercentage,
        '12th %': r.twelfthPercentage,
        'Active Backlogs': masterBacklogs(r),
      }))
      sheetName = 'Students'
    } else if (category === 'Companies') {
      data = companiesList.map(c => ({
        'Company Name': c.name,
        'Sector': c.sector,
        'Type': c.type,
        'Location': c.location,
        'Package': c.package,
        'Drive Mode': c.mode,
        'Job Type': c.jobType,
        'Status': c.status,
        'Academic Year': c.academicYear,
      }))
      sheetName = 'Companies'
    } else if (category === 'TPO Dashboard') {
      data = companiesList.map(c => {
        const hires = placementsList.filter(p => p.company.toLowerCase() === c.name.toLowerCase())
        const branchCounts: Record<string, number> = {}
        hires.forEach(h => {
          branchCounts[h.branch] = (branchCounts[h.branch] || 0) + 1
        })
        const deptStr = Object.entries(branchCounts).map(([b, cnt]) => `${b} (${cnt})`).join(' | ')
        return {
          'Company Name': c.name,
          'Sector': c.sector,
          'Mode of Drive': c.mode,
          'Job Type': c.jobType,
          'Package Offered': c.package,
          'No. of Selections': hires.length,
          'Department Hires': deptStr || 'None',
        }
      })
      sheetName = 'TPO_Analytics'
    } else if (category === 'Placements') {
      data = placementsList.map(p => ({
        'Student Name': p.student,
        'Roll Number': p.id,
        'Branch': p.branch,
        'Company': p.company,
        'Role': p.role,
        'Package': p.package,
        'Date': p.date,
        'Type': p.type,
      }))
      sheetName = 'Placements'
    }

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    XLSX.writeFile(workbook, `${sheetName.toLowerCase()}_report.xlsx`)
    showToast(`${category} Excel report downloaded successfully!`)
  }

  function handleDownloadPdf(category: string) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    let title = ''
    let tableHeaders = ''
    let tableRows = ''

    if (category === 'Students') {
      title = 'Student Master Database Report'
      tableHeaders = '<tr><th>Roll Number</th><th>Name</th><th>Branch</th><th>CGPA</th><th>10th %</th><th>12th %</th><th>Backlogs</th></tr>'
      tableRows = masterRows.map(r => `
        <tr>
          <td>${r.rollNumber}</td>
          <td>${masterName(r)}</td>
          <td>${r.branch}</td>
          <td>${r.btechCgpa}</td>
          <td>${r.tenthPercentage}</td>
          <td>${r.twelfthPercentage}</td>
          <td>${masterBacklogs(r)}</td>
        </tr>
      `).join('')
    } else if (category === 'Companies') {
      title = 'Recruitment Drives Report'
      tableHeaders = '<tr><th>Company</th><th>Sector</th><th>Type</th><th>Location</th><th>Package</th><th>Mode</th><th>Job Type</th><th>Status</th></tr>'
      tableRows = companiesList.map(c => `
        <tr>
          <td>${c.name}</td>
          <td>${c.sector}</td>
          <td>${c.type}</td>
          <td>${c.location}</td>
          <td>${c.package}</td>
          <td>${c.mode}</td>
          <td>${c.jobType}</td>
          <td>${c.status}</td>
        </tr>
      `).join('')
    } else if (category === 'TPO Dashboard') {
      title = 'TPO Dashboard Report'
      tableHeaders = '<tr><th>Company</th><th>Mode</th><th>Job Type</th><th>Selections</th><th>Dept Hires</th><th>Package</th></tr>'
      tableRows = companiesList.map(c => {
        const hires = placementsList.filter(p => p.company.toLowerCase() === c.name.toLowerCase())
        const branchCounts: Record<string, number> = {}
        hires.forEach(h => {
          branchCounts[h.branch] = (branchCounts[h.branch] || 0) + 1
        })
        const deptStr = Object.entries(branchCounts).map(([b, cnt]) => `${b} (${cnt})`).join(' | ')
        return `
          <tr>
            <td>${c.name}</td>
            <td>${c.mode}</td>
            <td>${c.jobType}</td>
            <td>${hires.length}</td>
            <td>${deptStr || 'None'}</td>
            <td>${c.package}</td>
          </tr>
        `
      }).join('')
    } else if (category === 'Placements') {
      title = 'Placements Placement Offers Report'
      tableHeaders = '<tr><th>Student</th><th>Roll Number</th><th>Branch</th><th>Company</th><th>Role</th><th>Package</th><th>Date</th></tr>'
      tableRows = placementsList.map(p => `
        <tr>
          <td>${p.student}</td>
          <td>${p.id}</td>
          <td>${p.branch}</td>
          <td>${p.company}</td>
          <td>${p.role}</td>
          <td>${p.package}</td>
          <td>${p.date}</td>
        </tr>
      `).join('')
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #777; }
          </style>
        </head>
        <body>
          <h1>PlacePro - ${title}</h1>
          <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <table>
            <thead>${tableHeaders}</thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="footer">PlacePro Placement Portal &copy; 2026 - Official Report</div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
    showToast(`${category} PDF report loaded in print view.`)
  }

  function handleGenerateAiSummary() {
    setIsAiLoading(true)
    setTimeout(() => {
      setAiSummary(
        '🤖 AI Report Generator Summary:\n\n' +
        `This year ${placementsList.length} students were placed. ` +
        `We have verified ${masterRows.length} registered students in the master database. ` +
        `Recruiters have conducted a total of ${companiesList.length} recruitment drives.\n\n` +
        `Average placement package for the season stands at ₹ ${avgPackage} LPA. ` +
        `IT companies constitute ${companiesList.filter(c => c.jobType === 'IT').length} of the total drive list.`
      )
      setIsAiLoading(false)
      showToast('AI Summary generated successfully!')
    }, 1000)
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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate analytical logs, search specific records repository files, preview PDF/Excel files, and run the AI summary engine.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => showToast('Printing current reports list view…')}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Print view
          </button>
        </div>
      </div>

      {/* AI Assistant Summary Box */}
      <div className="card-surface p-5 md:p-6 mb-6 space-y-4 border border-primary/20 bg-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary shrink-0 animate-bounce" />
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">AI Report Generator</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Let AI parse report records and summarize seasonal placements.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerateAiSummary}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-pop hover:opacity-95 cursor-pointer shrink-0 transition"
          >
            <Sparkles className="h-3.5 w-3.5 animate-spin" /> {isAiLoading ? 'Analyzing…' : 'Generate Placement Summary'}
          </button>
        </div>

        {aiSummary && (
          <div className="p-4 bg-background border border-primary/10 rounded-lg text-xs leading-relaxed text-muted-foreground animate-in fade-in duration-300">
            {aiSummary.split('\n').map((line, idx) => (
              <div key={idx} className="mt-1">{line}</div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2 mb-6">
        <div className="card-surface p-5 md:p-6">
          <h3 className="mb-4 font-semibold text-foreground">Branch-wise Placement Rate</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchPlacement}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(92.8% 0.012 255)" />
                <XAxis dataKey="branch" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="placed" name="Placed" fill="oklch(54.6% 0.215 262.88)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total" name="Total" fill="oklch(92.8% 0.012 255)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5 md:p-6">
          <h3 className="mb-4 font-semibold text-foreground">Package Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={packageDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                  {packageDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Reports Search, Category Filters, and Table */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {['All', ...categories.slice(1)].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilterCategory(c)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  filterCategory === c
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input hover:bg-muted'
                }`}
              >
                {c === 'All' ? 'All categories' : c}
              </button>
            ))}
          </div>

          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search reports by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="card-surface overflow-hidden">
          <div className="border-b border-border px-5 py-4 md:px-6">
            <h3 className="font-semibold">Reports Repository</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Report</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Generated</th>
                  <th className="px-5 py-3 font-medium">Size</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 font-bold">{r.name}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{r.category}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.date}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.size}</td>
                    <td className="px-5 py-3 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewReport(r)}
                        className="inline-flex h-8 px-2.5 items-center gap-1 rounded bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadExcel(r.category)}
                        className="inline-flex h-8 px-2.5 items-center gap-1 rounded bg-success/15 hover:bg-success/20 text-xs font-semibold text-success cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" /> Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(r.category)}
                        className="inline-flex h-8 px-2.5 items-center gap-1 rounded bg-primary/15 hover:bg-primary/20 text-xs font-semibold text-primary cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PDF/Excel Report Previewer Modal */}
      {previewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg card-surface p-6 shadow-pop animate-in zoom-in-95 duration-200 relative">
            <button
              type="button"
              onClick={() => setPreviewReport(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">{previewReport.name}</h2>
                <p className="text-xs text-muted-foreground">Category: {previewReport.category} · Size: {previewReport.size}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>File Format: <strong>PDF/Excel Preview</strong></span>
                <span>Generated: <strong>{previewReport.date}</strong></span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Document Preview Contents</span>
                <div className="p-4 bg-muted/30 border border-border rounded-lg text-xs leading-relaxed text-muted-foreground font-mono whitespace-pre-line">
                  {previewReport.content}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
              <button
                type="button"
                onClick={() => setPreviewReport(null)}
                className="h-10 px-4 rounded-lg border border-input text-sm font-semibold hover:bg-muted"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

