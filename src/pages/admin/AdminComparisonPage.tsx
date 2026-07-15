import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  GitCompareArrows,
  Users,
  Briefcase,
  TrendingUp,
  Award,
  Building2,
  Target,
  BadgeIndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from 'lucide-react'
import { getAuthToken } from '../../lib/auth'
import { useAcademicYear } from '../../lib/AcademicYearContext'

interface ComparisonData {
  year: string
  totalStudents: number
  totalPlaced: number
  totalCompanies: number
  placementPercentage: number
  highestPackage: number
  avgPackage: number
}

const ACCENT_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', bar: 'oklch(54.6% 0.215 262.88)' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'oklch(62% 0.15 140)' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', bar: 'oklch(65% 0.2 320)' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'oklch(78% 0.15 75)' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', bar: 'oklch(58% 0.18 28)' },
]

export function AdminComparisonPage() {
  const { academicYears } = useAcademicYear()
  const [selectedYears, setSelectedYears] = useState<string[]>([])
  const [comparison, setComparison] = useState<ComparisonData[]>([])
  const [loading, setLoading] = useState(false)

  // Default: pick the 2 most recent non-upcoming years
  useEffect(() => {
    if (academicYears.length > 0 && selectedYears.length === 0) {
      const sorted = [...academicYears].sort((a, b) => b.academic_year.localeCompare(a.academic_year))
      const defaults = sorted.slice(0, 2).map((y) => y.academic_year)
      setSelectedYears(defaults)
    }
  }, [academicYears]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedYears.length >= 2) fetchComparison()
  }, [selectedYears]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchComparison() {
    try {
      setLoading(true)
      const token = getAuthToken()
      const res = await fetch(`/api/dashboard/comparison?years=${selectedYears.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data: ComparisonData[] = await res.json()
        setComparison(data.sort((a, b) => a.year.localeCompare(b.year)))
      }
    } catch (err) {
      console.error('Failed to fetch comparison:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleYear = (year: string) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    )
  }

  const chartData = comparison.map((c) => ({
    year: c.year,
    'Students': c.totalStudents,
    'Placed': c.totalPlaced,
    'Companies': c.totalCompanies,
    'Placement %': c.placementPercentage,
    'Highest (LPA)': c.highestPackage,
    'Average (LPA)': c.avgPackage,
  }))

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <GitCompareArrows className="h-7 w-7 text-primary" />
            Year Comparison
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare placement statistics across multiple academic years
          </p>
        </div>
        {selectedYears.length >= 2 && (
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 cursor-pointer"
            >
              <Download className="h-4 w-4" /> Download PDF
            </button>
          </div>
        )}
      </div>

      {/* Year selector pills */}
      <div className="mb-6 card-surface p-4 print:hidden">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Select Years to Compare (minimum 2)
        </div>
        <div className="flex flex-wrap gap-2">
          {academicYears.map((y) => {
            const isSelected = selectedYears.includes(y.academic_year)
            return (
              <button
                key={y.id}
                onClick={() => toggleYear(y.academic_year)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {y.academic_year}
                {isSelected && ' ✓'}
              </button>
            )
          })}
        </div>
      </div>

      {selectedYears.length < 2 ? (
        <div className="card-surface p-12 text-center">
          <GitCompareArrows className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Select at least 2 years to compare</p>
        </div>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Comparison Cards */}
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `repeat(${Math.min(comparison.length, 4)}, minmax(0, 1fr))` }}>
            {comparison.map((c, idx) => {
              const accent = ACCENT_COLORS[idx % ACCENT_COLORS.length]
              const prev = idx > 0 ? comparison[idx - 1] : null
              const pctChange = prev && prev.placementPercentage > 0
                ? Math.round(((c.placementPercentage - prev.placementPercentage) / prev.placementPercentage) * 100)
                : null

              return (
                <div key={c.year} className={`card-surface overflow-hidden border-t-4 ${accent.border} print:break-inside-avoid`}>
                  <div className={`px-5 py-3 ${accent.bg}`}>
                    <h3 className={`text-lg font-bold ${accent.text}`}>{c.year}</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Students
                      </span>
                      <span className="font-bold text-lg">{c.totalStudents}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" /> Placed
                      </span>
                      <span className="font-bold text-lg">{c.totalPlaced}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" /> Placement %
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{c.placementPercentage}%</span>
                        {pctChange !== null && (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${pctChange >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {pctChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {Math.abs(pctChange)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <hr className="border-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5" /> Highest Pkg
                      </span>
                      <span className="font-bold">Rs. {c.highestPackage} LPA</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <BadgeIndianRupee className="h-3.5 w-3.5" /> Avg Pkg
                      </span>
                      <span className="font-bold">Rs. {c.avgPackage} LPA</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> Companies
                      </span>
                      <span className="font-bold">{c.totalCompanies}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Comparison Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Placement % Comparison */}
            <div className="card-surface p-5 print:break-inside-avoid">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Placement % Comparison
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip />
                  <Bar dataKey="Placement %" fill="oklch(54.6% 0.215 262.88)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Package Comparison */}
            <div className="card-surface p-5 print:break-inside-avoid">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Package Comparison
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" LPA" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Highest (LPA)" fill="oklch(65% 0.2 320)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="Average (LPA)" fill="oklch(66% 0.12 220)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Students vs Placed */}
            <div className="card-surface p-5 print:break-inside-avoid">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Students vs Placed
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Students" stroke="oklch(54.6% 0.215 262.88)" strokeWidth={2} isAnimationActive={false} />
                  <Line type="monotone" dataKey="Placed" stroke="oklch(62% 0.15 140)" strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Company Growth */}
            <div className="card-surface p-5 print:break-inside-avoid">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Companies Visiting
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Companies" fill="oklch(78% 0.15 75)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </>
  )
}
