import { Outlet } from 'react-router-dom'
import {
  Bell,
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  GraduationCap,
} from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import { getAuthSession } from '../lib/auth'

const navItems = [
  { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
  { label: 'Student Details', href: '/student/registration', icon: ClipboardList },
  { label: 'Drives', href: '/student/drives', icon: Briefcase },
  { label: 'Career Hub', href: '/student/career', icon: GraduationCap },
  { label: 'Notifications', href: '/student/notifications', icon: Bell, badge: 2 },
]

export function StudentLayout() {
  const session = getAuthSession()

  return (
    <DashboardLayout
      portal="student"
      navItems={navItems}
      userInitials="ST"
      userRole="student"
      userEmail={session?.email ?? 'student@college.edu'}
    >
      <Outlet />
    </DashboardLayout>
  )
}
