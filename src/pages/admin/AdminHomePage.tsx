import {
  BadgeIndianRupee,
  Building2,
  Download,
  Funnel,
  GraduationCap,
  Plus,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Briefcase,
  FileText,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  loadMasterRows,
  loadPlacementForms,
  loadFormSubmissions,
  loadCompanies,
  loadPlacements,
  useStoreState,
} from '../../lib/placeproStore'


// Helper to calculate dynamic monthly trends
function getDynamicTrendData(placements: any[], submissions: any[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentMonthIdx = new Date().getMonth()
  // Last 8 months
  const last8Months = Array.from({ length: 8 }, (_, i) => {
    const idx = (currentMonthIdx - 7 + i + 12) % 12
    return months[idx]
  })

  // Group applications (submissions) and offers (placements) by month
  const monthlyData = last8Months.map(monthName => {
    const appsCount = submissions.filter(s => {
      if (!s.submittedAt) return false
      const month = new Date(s.submittedAt.replace(' ', 'T')).getMonth()
      return months[month] === monthName
    }).length
    
    const offersCount = placements.filter(p => {
      if (!p.date) return false
      const month = new Date(p.date).getMonth()
      return months[month] === monthName
    }).length

    return {
      month: monthName,
      applications: appsCount,
      offers: offersCount
    }
  })

  return monthlyData
}


function TrendBadge({ value }: { value: string }) {
  const positive = value.startsWith('+')
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        positive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
      }`}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value}
    </div>
  )
}

export function AdminHomePage() {
  const students = useStoreState(loadMasterRows) ?? []
  const forms = useStoreState(loadPlacementForms) ?? []
  const submissions = useStoreState(loadFormSubmissions) ?? []
  const companies = useStoreState(loadCompanies) ?? []
  const placements = useStoreState(loadPlacements) ?? []

  const trendData = getDynamicTrendData(placements, submissions)

  // Dynamic statistics calculations
  const totalStudentsVal = students.length
  const registeredCountVal = submissions.filter(s => s.formId === 'FRM-001').reduce((acc, curr) => {
    // Unique students who registered
    if (!acc.includes(curr.roll)) acc.push(curr.roll)
    return acc;
  }, [] as string[]).length
  const pendingCountVal = totalStudentsVal - registeredCountVal >= 0 ? totalStudentsVal - registeredCountVal : 0

  const placedCountVal = placements.length
  const eligibleCountVal = students.filter(s => {
    const cgpaVal = parseFloat(s.btechCgpa)
    return isNaN(cgpaVal) ? false : cgpaVal >= 6.0
  }).length

  const companiesCountVal = companies.length

  // Find highest package
  let highestPkgStr = 'N/A'
  let highestSub = 'No selections'
  if (placements.length > 0) {
    let maxLpa = 0
    let bestPlacement = placements[0]
    placements.forEach(p => {
      const numericLpa = parseFloat(p.package.replace(/[₹ LPA,]/g, ''))
      if (!isNaN(numericLpa) && numericLpa > maxLpa) {
        maxLpa = numericLpa
        bestPlacement = p
      }
    })
    if (maxLpa > 0) {
      highestPkgStr = `₹ ${maxLpa} LPA`
      highestSub = `${bestPlacement.company} · ${bestPlacement.branch}`
    }
  }

  // Calculate average package
  let avgPkgStr = 'N/A'
  if (placements.length > 0) {
    let sum = 0
    let count = 0
    placements.forEach(p => {
      const numericLpa = parseFloat(p.package.replace(/[₹ LPA,]/g, ''))
      if (!isNaN(numericLpa)) {
        sum += numericLpa
        count++
      }
    })
    if (count > 0) {
      avgPkgStr = `₹ ${(sum / count).toFixed(1)} LPA`
    }
  }

  const openFormsVal = forms.filter(f => f.status === 'Active').length
  const pendingApprovalsVal = submissions.filter(s => s.status === 'Pending').length

  // Live Recents
  const recentActivity = [
    { initials: 'AI', name: 'New student registrations synchronized', time: 'Just now · Live Sync' },
    { initials: 'CO', name: `Master roster size: ${students.length} students loaded`, time: 'Updated · System' },
    { initials: 'PL', name: `Total placed offers recorded: ${placements.length}`, time: 'Live Updates' },
    { initials: 'SY', name: 'System logs parsed successfully', time: 'System Check' },
  ]

  const finalRecentPlacements = placements.slice(-4).reverse().map(p => ({
    student: p.student,
    company: p.company,
    package: p.package,
    status: 'Placed' as const
  }))

  // Branch-wise placements from real data
  const realBranchDataMap: Record<string, number> = {}
  placements.forEach(p => {
    realBranchDataMap[p.branch] = (realBranchDataMap[p.branch] || 0) + 1
  })
  const branchData = Object.entries(realBranchDataMap).map(([branch, placed]) => ({ branch, placed }))

  // Company-wise placements from real data
  const realCompanyDataMap: Record<string, number> = {}
  placements.forEach(p => {
    realCompanyDataMap[p.company] = (realCompanyDataMap[p.company] || 0) + 1
  })
  const sortedCompanies = Object.entries(realCompanyDataMap).sort((a, b) => b[1] - a[1])
  const colors = [
    'oklch(54.6% 0.215 262.88)',
    'oklch(66% 0.16 152)',
    'oklch(78% 0.15 75)',
    'oklch(65% 0.2 320)',
    'oklch(70% 0.18 30)'
  ]
  const companyData = sortedCompanies.slice(0, 4).map(([name, value], i) => ({
    name,
    value,
    color: colors[i % colors.length]
  })).concat(sortedCompanies.length > 4 ? [{
    name: 'Others',
    value: sortedCompanies.slice(4).reduce((acc, curr) => acc + curr[1], 0),
    color: colors[4]
  }] : [])

  // Registration Progress
  const realDeptReg: Record<string, { total: number; reg: number }> = {}
  students.forEach(s => {
    const dept = s.branch || 'Other'
    if (!realDeptReg[dept]) realDeptReg[dept] = { total: 0, reg: 0 }
    realDeptReg[dept].total++
  })
  submissions.filter(s => s.formId === 'FRM-001').forEach(s => {
    // find student branch
    const stud = students.find(st => st.rollNumber === s.roll)
    const dept = stud?.branch || 'CSE'
    if (!realDeptReg[dept]) realDeptReg[dept] = { total: 0, reg: 0 }
    realDeptReg[dept].reg++
  })
  const registrationProgress = Object.entries(realDeptReg).map(([dept, data]) => ({
    dept,
    pct: Math.min(100, Math.round((data.reg / (data.total || 1)) * 100))
  }))

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of placements, registrations and recent activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> New drive
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {[
          { icon: Users, iconBg: 'bg-primary/10 text-primary', trend: '+4.2%', value: totalStudentsVal.toLocaleString(), label: 'Total Students' },
          { icon: UserCheck, iconBg: 'bg-info/15 text-info-foreground', trend: '+12%', value: registeredCountVal.toLocaleString(), label: 'Registered' },
          { icon: UserPlus, iconBg: 'bg-warning/15 text-warning-foreground', trend: '-6%', value: pendingCountVal.toLocaleString(), label: 'Pending' },
          { icon: GraduationCap, iconBg: 'bg-success/10 text-success', trend: '+18%', value: placedCountVal.toLocaleString(), label: 'Placed Students' },
          { icon: Funnel, iconBg: 'bg-primary/10 text-primary', value: eligibleCountVal.toLocaleString(), label: 'Eligible' },
          { icon: Building2, iconBg: 'bg-info/15 text-info-foreground', value: companiesCountVal.toLocaleString(), label: 'Companies Visited' },
          { icon: Trophy, iconBg: 'bg-warning/15 text-warning-foreground', value: highestPkgStr, label: 'Highest Package', sub: highestSub },
          { icon: BadgeIndianRupee, iconBg: 'bg-success/10 text-success', value: avgPkgStr, label: 'Average Package' },
          { icon: FileText, iconBg: 'bg-primary/10 text-primary', value: openFormsVal.toString(), label: 'Open Forms' },
          { icon: Briefcase, iconBg: 'bg-warning/15 text-warning-foreground', value: pendingApprovalsVal.toString(), label: 'Pending Approvals' },
        ].map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="card-surface card-hover p-5">
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                {card.trend && <TrendBadge value={card.trend} />}
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{card.label}</div>
                {card.sub && (
                  <div className="mt-1 text-[11px] text-muted-foreground/80">{card.sub}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="card-surface p-5 md:p-6 lg:col-span-2">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Placement Trend</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Applications vs Offers, last 8 months
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(92.8% 0.012 255)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="applications" stroke="oklch(54.6% 0.215 262.88)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="offers" stroke="oklch(66% 0.16 152)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5 md:p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Company-wise Placements</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Top recruiters this season</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={companyData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                  {companyData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5 md:p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-foreground">Branch-wise Placements</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(92.8% 0.012 255)" />
                <XAxis dataKey="branch" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="placed" fill="oklch(54.6% 0.215 262.88)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5 md:p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Registration Progress</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">By department</p>
          </div>
          <div className="space-y-4">
            {registrationProgress.map((item) => (
              <div key={item.dept}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{item.dept}</span>
                  <span className="text-muted-foreground">{item.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="card-surface p-5 md:p-6">
          <h3 className="mb-4 font-semibold text-foreground">Recent Activity</h3>
          <ul className="space-y-4">
            {recentActivity.map((item) => (
              <li key={item.name} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {item.initials}
                </div>
                <div>
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-surface overflow-hidden p-0 md:p-0">
          <div className="border-b border-border px-5 py-4 md:px-6">
            <h3 className="font-semibold text-foreground">Recent Placements</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium md:px-6">Student</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Package</th>
                  <th className="px-5 py-3 font-medium md:px-6">Status</th>
                </tr>
              </thead>
              <tbody>
                {finalRecentPlacements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                      No recent placements recorded.
                    </td>
                  </tr>
                ) : (
                  finalRecentPlacements.map((row, idx) => (
                    <tr key={row.student + idx} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium md:px-6">{row.student}</td>
                      <td className="px-5 py-3">{row.company}</td>
                      <td className="px-5 py-3">{row.package}</td>
                      <td className="px-5 py-3 md:px-6">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            row.status === 'Placed'
                              ? 'bg-success/10 text-success'
                              : 'bg-warning/15 text-warning-foreground'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
