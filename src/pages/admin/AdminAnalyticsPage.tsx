import { useEffect, useState } from 'react'
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Users,
  Building2,
  Target,
  Award,
} from 'lucide-react'
import { getAuthToken } from '../../lib/auth'
import { getShortBranchName } from '../../lib/branchUtils'

interface TrendData {
  year: string
  status: string
  totalStudents: number
  totalPlaced: number
  totalCompanies: number
  placementPercentage: number
  highestPackage: number
  avgPackage: number
  branchWise: Record<string, number>
  topRecruiters: { name: string; hires: number }[]
}

const CHART_COLORS = [
  'oklch(54.6% 0.215 262.88)',
  'oklch(62% 0.15 140)',
  'oklch(65% 0.2 320)',
  'oklch(78% 0.15 75)',
  'oklch(70% 0.18 30)',
  'oklch(66% 0.12 220)',
  'oklch(58% 0.18 28)',
  'oklch(72% 0.14 180)',
]

export function AdminAnalyticsPage() {
  const [trends, setTrends] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrends()
  }, [])

  async function fetchTrends() {
    try {
      setLoading(true)
      const token = getAuthToken()
      const res = await fetch('/api/analytics/trends', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setTrends(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch analytics trends:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading analytics...</span>
        </div>
      </div>
    )
  }

  // Prepare chart data
  const placementTrendData = trends.map((t) => ({
    year: t.year.replace('20', "'"),
    students: t.totalStudents,
    placed: t.totalPlaced,
    percentage: t.placementPercentage,
  }))

  const packageTrendData = trends.map((t) => ({
    year: t.year.replace('20', "'"),
    highest: t.highestPackage,
    average: t.avgPackage,
  }))

  const growthData = trends.map((t, i) => ({
    year: t.year.replace('20', "'"),
    growth: i > 0 && trends[i - 1].totalPlaced > 0
      ? Math.round(((t.totalPlaced - trends[i - 1].totalPlaced) / trends[i - 1].totalPlaced) * 100)
      : 0,
    companyGrowth: i > 0 && trends[i - 1].totalCompanies > 0
      ? Math.round(((t.totalCompanies - trends[i - 1].totalCompanies) / trends[i - 1].totalCompanies) * 100)
      : 0,
  }))

  // Branch trends
  const allBranches = new Set<string>()
  trends.forEach((t) => Object.keys(t.branchWise).forEach((b) => allBranches.add(getShortBranchName(b))))
  const branchTrendData = trends.map((t) => {
    const entry: Record<string, number | string> = { year: t.year.replace('20', "'") }
    Object.entries(t.branchWise).forEach(([branch, count]) => {
      const shortBranch = getShortBranchName(branch)
      entry[shortBranch] = Number(entry[shortBranch] || 0) + count
    })
    allBranches.forEach((branch) => { entry[branch] = entry[branch] || 0 })
    return entry
  })

  // Top recruiters (aggregate)
  const recruiterMap: Record<string, number> = {}
  trends.forEach((t) => t.topRecruiters.forEach((r) => { recruiterMap[r.name] = (recruiterMap[r.name] || 0) + r.hires }))
  const topRecruitersData = Object.entries(recruiterMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, hires]) => ({ name, hires }))

  // Department comparison for radar chart (latest year)
  const latestTrend = trends.length > 0 ? trends[trends.length - 1] : null
  const radarData = latestTrend
    ? Object.entries(latestTrend.branchWise).reduce<Array<{ branch: string; placed: number }>>((items, [branch, placed]) => {
        const shortBranch = getShortBranchName(branch)
        const existing = items.find((item) => item.branch === shortBranch)
        if (existing) {
          existing.placed += placed
        } else {
          items.push({ branch: shortBranch, placed })
        }
        return items
      }, [])
    : []

  // Offers per year (pie chart of latest year top companies)
  const latestRecruiters = latestTrend?.topRecruiters || []
  const pieData = latestRecruiters.slice(0, 6).map((r, i) => ({
    name: r.name,
    value: r.hires,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))

  // Summary cards
  const latest = trends[trends.length - 1]

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Placement Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Multi-year trends, branch analysis, and recruiter insights
        </p>
      </div>

      {/* Summary Strip */}
      {latest && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {[
            { label: 'Latest Placement %', value: `${latest.placementPercentage}%`, icon: <Target className="h-5 w-5" />, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Highest Package', value: `Rs. ${latest.highestPackage} LPA`, icon: <Award className="h-5 w-5" />, color: 'bg-purple-50 text-purple-700' },
            { label: 'Avg Package', value: `Rs. ${latest.avgPackage} LPA`, icon: <TrendingUp className="h-5 w-5" />, color: 'bg-blue-50 text-blue-700' },
            { label: 'Total Companies', value: String(latest.totalCompanies), icon: <Building2 className="h-5 w-5" />, color: 'bg-amber-50 text-amber-700' },
          ].map((card) => (
            <div key={card.label} className="card-surface p-4 flex items-center gap-3">
              <div className={`rounded-xl p-2.5 ${card.color}`}>{card.icon}</div>
              <div>
                <div className="text-xl font-bold">{card.value}</div>
                <div className="text-xs text-muted-foreground">{card.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Placement Trend */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <LineChartIcon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Placement Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={placementTrendData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="students" stroke="oklch(54.6% 0.215 262.88)" name="Total Students" strokeWidth={2} />
              <Line type="monotone" dataKey="placed" stroke="oklch(62% 0.15 140)" name="Placed" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 2. Package Growth */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Package Growth</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={packageTrendData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit=" LPA" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="highest" stroke="oklch(65% 0.2 320)" name="Highest Package" strokeWidth={2} />
              <Line type="monotone" dataKey="average" stroke="oklch(66% 0.12 220)" name="Average Package" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 3. Year-over-Year Growth */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Year-over-Year Growth</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Legend />
              <Bar dataKey="growth" fill="oklch(54.6% 0.215 262.88)" name="Placement Growth %" radius={[4, 4, 0, 0]} />
              <Bar dataKey="companyGrowth" fill="oklch(78% 0.15 75)" name="Company Growth %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 4. Branch Trends */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Branch Trends</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={branchTrendData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {[...allBranches].slice(0, 6).map((branch, i) => (
                <Bar key={branch} dataKey={branch} fill={CHART_COLORS[i % CHART_COLORS.length]} stackId="branches" radius={i === [...allBranches].slice(0, 6).length - 1 ? [4, 4, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 5. Top Recruiters */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Top Recruiters (All Time)</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topRecruitersData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
              <Tooltip />
              <Bar dataKey="hires" fill="oklch(54.6% 0.215 262.88)" name="Total Hires" radius={[0, 4, 4, 0]}>
                {topRecruitersData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 6. Department Comparison (Radar) */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Department Comparison {latestTrend ? `(${latestTrend.year})` : ''}</h3>
          </div>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="branch" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                <Radar name="Placed" dataKey="placed" stroke="oklch(54.6% 0.215 262.88)" fill="oklch(54.6% 0.215 262.88)" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No data available</div>
          )}
        </div>

        {/* 7. Offers Distribution (Pie) */}
        <div className="card-surface p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Offers Distribution {latestTrend ? `(${latestTrend.year})` : ''}</h3>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={110} innerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  )
}


