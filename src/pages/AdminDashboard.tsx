import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  FileBarChart,
  FileText,
  ScrollText,
  Settings,
  Users,
  GitCompareArrows,
} from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { DashboardLayout } from '../components/DashboardLayout'
import { getAuthSession } from '../lib/auth'

const navItems = [
  { label: 'TPO Dashboard', href: '/admin', icon: BarChart3 },
  { label: 'Students', href: '/admin/students', icon: Users },
  { label: 'Forms', href: '/admin/forms', icon: FileText },
  { label: 'Companies', href: '/admin/companies', icon: Building2 },
  { label: 'Placements', href: '/admin/placements', icon: Briefcase },

  { label: 'Year Comparison', href: '/admin/comparison', icon: GitCompareArrows },
  { label: 'Reports', href: '/admin/reports', icon: FileBarChart },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell, badge: 3 },
  { label: 'Audit Logs', href: '/admin/audit', icon: ScrollText },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminLayout() {
  const session = getAuthSession()

  return (
    <DashboardLayout
      portal="admin"
      navItems={navItems}
      userInitials="AD"
      userRole="admin"
      userEmail={session?.email ?? 'admin@college.edu'}
    >
      <Outlet />
    </DashboardLayout>
  )
}
