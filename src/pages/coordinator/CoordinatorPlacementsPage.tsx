import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Briefcase, Search, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { getAuthSession } from '../../lib/auth'
import { loadPlacements, loadMasterRows, useStoreState } from '../../lib/placeproStore'
import { matchesBranch, getShortBranchName } from '../../lib/branchUtils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function CoordinatorPlacementsPage() {
  const session = getAuthSession()
  const coordDept = session?.department || 'Computer Science Engineering'

  const placements = useStoreState(loadPlacements) ?? []
  const masterRows = useStoreState(loadMasterRows) ?? []

  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') || ''
  const [filterCompany, setFilterCompany] = useState('All')

  // Filter department placements
  const branchPlacements = useMemo(() => {
    return placements.filter((p) => {
      const inMaster = masterRows.some(
        (mr) => mr.rollNumber.trim().toUpperCase() === p.id.trim().toUpperCase() && matchesBranch(mr.branch, coordDept)
      )
      return inMaster || matchesBranch(p.branch, coordDept)
    })
  }, [placements, masterRows, coordDept])

  // Get unique companies list
  const companies = useMemo(() => {
    const list = new Set(branchPlacements.map((p) => p.company.trim()))
    return ['All', ...Array.from(list).sort()]
  }, [branchPlacements])

  // Search and Company filter
  const filteredPlacements = useMemo(() => {
    return branchPlacements.filter((p) => {
      const matchCompany = filterCompany === 'All' || p.company.trim().toLowerCase() === filterCompany.trim().toLowerCase()
      const matchSearch =
        p.student.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.company.toLowerCase().includes(search.toLowerCase()) ||
        p.role.toLowerCase().includes(search.toLowerCase())
      return matchCompany && matchSearch
    })
  }, [branchPlacements, search, filterCompany])

  function handleExtractExcel() {
    const exportRows = filteredPlacements.map((p) => ({
      'Student Name': p.student,
      'Roll Number': p.id,
      'Branch': p.branch,
      'Company': p.company,
      'Role': p.role,
      'Package': p.package,
      'Date': p.date,
      'Type': p.type,
      'Email': p.email || '',
      'Phone': p.phone || '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Branch Placements')
    XLSX.writeFile(workbook, `${getShortBranchName(coordDept).toLowerCase()}_placements_extract.xlsx`)
  }

  function handleExtractPdf() {
    const doc = new jsPDF()
    
    // Add title & headers
    doc.setFontSize(18)
    doc.text(`${getShortBranchName(coordDept)} Placements Report`, 14, 20)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Academic Year: ${(session as any)?.academicYear || 'Current Year'}`, 14, 28)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 34)
    doc.text(`Total Placements: ${filteredPlacements.length}`, 14, 40)
    doc.text(`Filtered by Company: ${filterCompany === 'All' ? 'All Companies' : filterCompany}`, 14, 46)

    // Prepare table headers and rows
    const headers = [['Roll Number', 'Student Name', 'Company', 'Role', 'Package', 'Type']]
    const data = filteredPlacements.map((p) => [
      p.id,
      p.student,
      p.company,
      p.role,
      p.package ? p.package.replace(/₹/g, 'Rs.').trim() : '',
      p.type,
    ])

    // Generate table using autoTable
    // @ts-ignore
    autoTable(doc, {
      head: headers,
      body: data,
      startY: 52,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { top: 52, left: 14, right: 14 }
    })

    doc.save(`${getShortBranchName(coordDept).toLowerCase()}_placements_report.pdf`)
  }

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

        <select
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none text-foreground cursor-pointer focus:border-ring focus:ring-2 focus:ring-ring sm:w-48"
        >
          {companies.map((c) => (
            <option key={c} value={c}>
              {c === 'All' ? 'All Companies' : c}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleExtractExcel}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 cursor-pointer shrink-0"
        >
          <Download className="h-4 w-4" /> Extract Excel
        </button>

        <button
          type="button"
          onClick={handleExtractPdf}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-pop hover:opacity-95 cursor-pointer shrink-0"
        >
          <Download className="h-4 w-4" /> Extract PDF
        </button>
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
