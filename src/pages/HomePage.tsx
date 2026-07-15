import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CircleCheck,
  Users,
  Compass,
  FileSpreadsheet,
  Cpu,
  Mail,
  TrendingUp,
  Award,
  Database,
  Building,
  CheckCircle2,
} from 'lucide-react'

const featureHighlights = [
  {
    title: 'Role-Based Access Control',
    desc: 'Admins and Students with secure permissions.',
    icon: Users,
  },
  {
    title: 'Dynamic Form Builder',
    desc: 'Create, schedule, and manage placement forms with auto-save drafts.',
    icon: FileSpreadsheet,
  },
  {
    title: 'Smart Eligibility Engine',
    desc: 'Generate eligible student lists using dynamic criteria and filters.',
    icon: Cpu,
  },
  {
    title: 'Company Analytics Dashboard',
    desc: 'Monitor selections, branch-wise statistics, packages, and trends.',
    icon: TrendingUp,
  },
  {
    title: 'Reports Repository',
    desc: 'Generate and download Excel and PDF reports anytime.',
    icon: Database,
  },
  {
    title: 'AI Career Assistant',
    desc: 'Provide interview preparation, technology roadmaps, learning guidance, and career recommendations.',
    icon: Compass,
  },
  {
    title: 'Bulk Notifications',
    desc: 'Send emails and announcements to departments or selected students.',
    icon: Mail,
  },
  {
    title: 'Real-Time Placement Tracking',
    desc: 'Track company drives, selections, and placement statistics instantly.',
    icon: Award,
  },
]

const recentDrives = [
  { company: 'Google', date: 'Jul 10', pkg: '₹ 32.5 LPA', status: 'In Progress' },
  { company: 'Amazon', date: 'Jul 05', pkg: '₹ 45.0 LPA', status: 'Completed' },
  { company: 'Microsoft', date: 'Jun 28', pkg: '₹ 48.0 LPA', status: 'Completed' },
  { company: 'TCS', date: 'Jun 20', pkg: '₹ 7.5 LPA', status: 'Completed' },
]

const branchDistribution = [
  { branch: 'CSE', percentage: 92, count: 184 },
  { branch: 'ECE', percentage: 84, count: 126 },
  { branch: 'EE', percentage: 76, count: 98 },
  { branch: 'ME', percentage: 68, count: 82 },
]

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white font-sans antialiased">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2.5">
            <img
              src="/placego-logo.png"
              alt="PlaceGO!"
              className="h-9 w-9 rounded-xl object-contain shadow-sm shadow-blue-500/30"
            />
            <span className="text-xl font-bold tracking-tight text-slate-900">PlaceGO!</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/login?role=admin"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/10 hover:bg-blue-700 transition-all hover:shadow-md cursor-pointer"
            >
              Open portal
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="mx-auto grid max-w-7xl items-start gap-12 px-4 pb-20 pt-12 md:px-8 lg:grid-cols-12 lg:pt-16">
        {/* Left copy */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100 w-fit">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
            Trusted by Training & Placement Cells across India
          </span>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl lg:text-6xl leading-[1.1]">
            Placement Intelligence
            <br />
            <span className="text-blue-600">for the next generation</span>
            <br />
            of campuses.
          </h1>

          <div className="mt-6 flex flex-wrap gap-2 text-lg font-bold text-slate-800">
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Smarter Placements.</span>
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Better Careers.</span>
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Powered by AI.</span>
          </div>

          <div className="mt-6 max-w-xl space-y-4 text-[15px] leading-relaxed text-slate-600">
            <p>
              A unified platform for students and placement administrators to manage registrations, automate eligibility screening, track company drives, monitor placements, generate reports, and deliver real-time analytics.
            </p>
            <p>
              Empower students with AI career guidance, technology roadmaps, interview preparation, and learning resources while enabling placement teams to make faster and smarter decisions.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login?role=admin"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-xl transition-all"
            >
              Launch Admin Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login?role=student"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
            >
              Open Student Portal
            </Link>
          </div>
        </div>

        {/* Right side Dashboard Preview */}
        <div className="lg:col-span-6 relative">
          <div className="absolute -inset-4 rounded-3xl bg-blue-500/10 blur-3xl opacity-60" />
          
          {/* Main Dashboard Panel Mock */}
          <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-100">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recruitment Operations</div>
                <div className="text-sm font-extrabold text-slate-800">Placement Intelligence & Analytics</div>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 animate-pulse">
                Live Overview
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Total', value: '1,500' },
                { label: 'Registered', value: '1,280' },
                { label: 'Eligible', value: '956' },
                { label: 'Placed', value: '612' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-center">
                  <div className="text-[10px] text-slate-400 font-medium truncate">{stat.label}</div>
                  <div className="text-sm font-extrabold text-slate-800 mt-0.5">{stat.value}</div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Companies Visited', value: '128' },
                { label: 'Highest Package', value: '₹ 48.0 LPA' },
                { label: 'Average Package', value: '₹ 8.6 LPA' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-center">
                  <div className="text-[10px] text-slate-400 font-medium truncate">{stat.label}</div>
                  <div className="text-sm font-extrabold text-slate-800 mt-0.5">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Charts & Details */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Placement Trend bar chart */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 flex flex-col justify-between">
                <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-blue-600" /> Placement Trend (Offers)
                </div>
                <div className="mt-3 flex h-24 items-end gap-1.5 justify-center border-b border-slate-200/80 pb-1">
                  {[25, 45, 30, 65, 50, 85, 70, 95, 80].map((h, idx) => (
                    <div
                      key={idx}
                      className="w-full rounded bg-blue-600/90 hover:bg-blue-600 transition-colors"
                      style={{ height: `${h}%` }}
                      title={`Batch offer weight: ${h}%`}
                    />
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[8px] text-slate-400 font-mono">
                  <span>2020</span>
                  <span>2023</span>
                  <span>2026</span>
                </div>
              </div>

              {/* Branch Wise Distribution */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <div className="text-[11px] font-bold text-slate-500">
                  Branch Placement Distribution
                </div>
                <div className="mt-3 space-y-2">
                  {branchDistribution.map((b) => (
                    <div key={b.branch} className="text-[10px]">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>{b.branch}</span>
                        <span>{b.count} placed ({b.percentage}%)</span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-200">
                        <div
                          className="h-1.5 rounded-full bg-blue-600"
                          style={{ width: `${b.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent drives & Top recruiters */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2 border-t border-slate-100 pt-3">
              {/* Recent drives list */}
              <div>
                <div className="text-[11px] font-bold text-slate-500 mb-2">Recent Campus Drives</div>
                <div className="space-y-1.5 text-[10px]">
                  {recentDrives.map((d) => (
                    <div key={d.company} className="flex items-center justify-between border-b border-slate-100 pb-1 last:border-0">
                      <span className="font-bold text-slate-700">{d.company}</span>
                      <span className="text-slate-400">{d.date}</span>
                      <span className="font-semibold text-emerald-600">{d.pkg}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Top recruiters list */}
              <div>
                <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-1">
                  <Building className="h-3 w-3 text-blue-600" /> Top Recruiters
                </div>
                <div className="flex flex-wrap gap-1">
                  {['Google', 'Amazon', 'Microsoft', 'TCS', 'Wipro', 'Cognizant', 'Infosys', 'Adobe', 'Uber'].map((comp) => (
                    <span
                      key={comp}
                      className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[9px] font-semibold text-slate-600 shadow-sm"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE HIGHLIGHTS */}
      <section className="border-t border-slate-200 bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Platform Features & Highlights
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-500">
              Everything placement cells and departments need to orchestrate career launches.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featureHighlights.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className="rounded-xl border border-slate-200/80 bg-white p-5 hover:border-blue-300 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900 text-sm">{feat.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{feat.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* AI SECTION */}
      <section className="border-t border-slate-200 bg-slate-50 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-blue-150 bg-gradient-to-tr from-blue-600 to-indigo-700 p-6 md:p-10 text-white shadow-xl shadow-blue-500/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1 bg-white/10 rounded-full px-3 py-1 text-xs font-semibold text-white">
                  <Cpu className="h-3.5 w-3.5 animate-pulse" /> AI-Powered
                </div>
                <h2 className="text-2xl font-extrabold md:text-3xl">AI Career Assistant</h2>
                <p className="text-white/80 text-sm max-w-lg leading-relaxed">
                  Ask questions naturally and receive personalized guidance. The AI companion helps students refine resumes, prepare for specific technical interviews, draft emails, and plan career milestones.
                </p>
                
                <div className="border-t border-white/10 pt-4">
                  <div className="text-xs font-semibold text-white/90 uppercase tracking-wider mb-2">
                    Get instant guidance on:
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-white/80">
                    {['Technology roadmaps', 'Interview preparation', 'Resume building', 'Career planning', 'Learning resources', 'Trending technologies', 'Placement preparation strategies'].map((item) => (
                      <li key={item} className="flex items-center gap-1.5">
                        <CircleCheck className="h-3.5 w-3.5 text-blue-300" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Chat preview card */}
              <div className="w-full md:w-80 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 p-4 text-xs space-y-3 shrink-0">
                <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-bold">PlaceGO! AI Assistant</span>
                </div>
                <div className="rounded bg-white/5 p-2 font-mono leading-relaxed text-white/90">
                  <span className="text-blue-200">User:</span> How do I prepare for a software engineering mock interview?
                </div>
                <div className="rounded bg-white/5 p-2 font-mono leading-relaxed text-white/90">
                  <span className="text-emerald-300">AI:</span> Focus on Data Structures, Algorithms, System Design, and practice mock behavioral questions using the STAR method.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-12 text-center text-xs text-slate-500">
        © 2026 PlaceGO! · Built for college & university placement cells
      </footer>
    </div>
  )
}
