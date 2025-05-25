"use client";

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const customLabels: Record<string, string> = {
  patients: "All Patients",
  clinicians: "Clinician List",
  profile: "My Profile",
  dashboard: "Dashboard"
}

function formatSegment(segment: string) {
  return customLabels[segment] || segment
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export default function DynamicBreadcrumb() {
  const pathname = usePathname()
  const pathSegments = pathname.split("/").filter(Boolean)

  return (
    <Breadcrumb className="hidden sm:flex">
      <BreadcrumbList>

        {pathSegments.map((segment, index) => {
          const href = "/" + pathSegments.slice(0, index + 1).join("/")
          const isLast = index === pathSegments.length - 1
          const label = formatSegment(decodeURIComponent(segment))

          return (
            <div key={href} className="flex items-center space-x-2.5">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
