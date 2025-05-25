"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import NavUser from "@/components/layout/NavUser"
import { cn } from "@/lib/utils"
import {
  Calendar,
  LayoutDashboardIcon,
  Stethoscope,
  Settings,
  UsersRound,
} from "lucide-react"
import {
  SidebarGroupLabel,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { toast } from "sonner"

type SidebarProps = {
  className?: string
}

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isRouteActive = (prefix: string) => pathname.startsWith(prefix)

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
      });

      if (response.ok) {
        // Clear session storage
        sessionStorage.removeItem('user');
        // Redirect to login page
        router.push('/');
        toast.success('Logged out successfully');
      } else {
        toast.error('Failed to logout');
      }
    } catch (error) {
      toast.error('Error during logout');
    }
  };

  return (
    <SidebarProvider>
      <div className={cn("hidden border-r bg-muted/40 md:block w-[300px]", className)}>
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center px-1 lg:h-[60px] border-b">
            <NavUser />
          </div>

          <div className="flex-1 overflow-y-auto">
            <nav className="grid items-start px-2 text-sm lg:px-4">
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <Link
                href="/Dashboard"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  isRouteActive("/Dashboard") && pathname === "/Dashboard"
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <LayoutDashboardIcon className="h-4 w-4" />
                Dashboard
              </Link>

              <Link
                href="/Dashboard/Appointments"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  isRouteActive("/Dashboard/Appointments")
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <Calendar className="h-4 w-4" />
                Appointments
              </Link>

              <Link
                href="/Dashboard/Patients"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  isRouteActive("/Dashboard/Patients")
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <UsersRound className="h-4 w-4" />
                Patients
              </Link>

              <Link
                href="/Dashboard/Clinicians"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  isRouteActive("/Dashboard/Clinicians")
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <Stethoscope className="h-4 w-4" />
                Clinicians
              </Link>
            </nav>
          </div>

          <div className="flex h-14 items-center border-t">
            <nav className="grid w-full items-start px-2 text-sm font-medium lg:px-4">
              <Link
                href="/Settings"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  isRouteActive("/Settings")
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}