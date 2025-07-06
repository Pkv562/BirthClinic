"use client"

import {
  ChevronsUpDown,
  LogOut,
} from "lucide-react"
import { useEffect, useState } from "react"
import { getUserDataFromCookie } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type UserData = {
  name: string;
  firstName: string;
  role: string;
  avatar: string | null;
  userType: 'admin' | 'clinician';
  isAdmin: boolean;
  isDoctor: boolean;
}

export default function NavUser() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)

  useEffect(() => {
    // First try to get user data from sessionStorage (for current tab)
    const storedUser = sessionStorage.getItem('user')
    if (storedUser) {
      setUserData(JSON.parse(storedUser))
      return
    }

    // If not in sessionStorage, try to get from cookie (for new tabs)
    const cookieUserData = getUserDataFromCookie()
    if (cookieUserData) {
      setUserData(cookieUserData)
      // Also store in sessionStorage for this tab
      sessionStorage.setItem('user', JSON.stringify(cookieUserData))
    }
  }, [])

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
      });

      if (response.ok) {
        sessionStorage.removeItem('user');
        // Also clear the user_data cookie
        document.cookie = 'user_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        router.push("/")
        toast.success('Logged out successfully');
      } else {
        toast.error('Failed to logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout');
    }
  }

  const displayName = userData?.name || "Loading..."
  const displayRole = userData?.role || "Loading..."
  const displayAvatar = userData?.avatar || ""
  const firstLetter = userData?.firstName?.charAt(0).toUpperCase() || "?"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <Avatar className="h-8 w-8 rounded-lg">
            {displayAvatar ? (
              <AvatarImage src={displayAvatar} alt={displayName} />
            ) : null}
            <AvatarFallback className="rounded-lg">
              {firstLetter}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{displayName}</span>
            <span className="truncate text-xs">{displayRole}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        side={isMobile ? "bottom" : "right"}
        align="start"
        sideOffset={0}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              {displayAvatar ? (
                <AvatarImage src={displayAvatar} alt={displayName} />
              ) : null}
              <AvatarFallback className="rounded-lg">
                {firstLetter}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{displayName}</span>
              <span className="truncate text-xs">{displayRole}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}