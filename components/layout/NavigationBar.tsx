"use client";

import Sidebar from "@/components/layout/Sidebar";
import AppointmentForm from "@/components/dashboard/appointments/AppointmentForm";

import { 
    Search, 
    Menu, 
    Bell, 
} from "lucide-react"
import { 
    Sheet, 
    SheetContent, 
    SheetTrigger 
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import DynamicBreadcrumb from "@/components/custom-ui/dynamic-breadcrumb"
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/hooks/useCurrentUser"

interface NavigationBarProps {
    className?: string;
}

export default function NavigationBar({ className }: NavigationBarProps) {
    const [open, setOpen] = useState(false)
    const [showAppointmentForm, setShowAppointmentForm] = useState(false)
    const router = useRouter()
    const { userData } = useCurrentUser()

    const getNavigationItems = () => {
        const items = [
            { href: "/Dashboard/Appointments/Appointment-Form", label: "Set an Appointment", action: () => setShowAppointmentForm(true) },
            { href: "/Dashboard/Patients/Patient-Form", label: "Add a Patient" }
        ];

        // Only add clinician form for admin users
        if (userData?.isAdmin) {
            items.push({ href: "/Dashboard/Clinicians/Clinician-Form", label: "Add a Clinician" });
        }

        return items;
    }

    const navigationItems = getNavigationItems();

    const handleCommandSelect = (item: { href: string; label: string; action?: () => void }) => {
        if (item.action) {
            item.action();
        } else {
            router.push(item.href);
        }
        setOpen(false);
    };

    return (
        <header className={cn(
            "flex h-14 items-center gap-4 px-4 lg:h-[60px] lg:px-6 md:justify-between border-b bg-white",
            className
        )}>
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="md:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[240px] sm:w-[280px]">
                    <Sidebar />
                </SheetContent>
            </Sheet>

            <DynamicBreadcrumb />

            <div className="ml-auto flex items-center gap-2">
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Type a command or search..."
                                className="w-60 bg-background pl-8"
                                onClick={() => setOpen(true)}
                            />
                        </div>
                    </DialogTrigger>
                    <DialogContent className="p-0">
                        <DialogTitle className="sr-only">Search Commands</DialogTitle>
                        <Command>
                            <CommandInput placeholder="Type a command or search..." />
                            <CommandList>
                                <CommandEmpty>No results found.</CommandEmpty>
                                <CommandGroup heading="Quick Commands">
                                    {navigationItems.map((item) => (
                                        <CommandItem
                                            key={item.href}
                                            onSelect={() => handleCommandSelect(item)}
                                        >
                                            {item.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </DialogContent>
                </Dialog>

                <Button variant="outline" size="icon">
                    <Bell className="h-4 w-4" />
                    <span className="sr-only">Notifications</span>
                </Button>
            </div>

            <AppointmentForm
                open={showAppointmentForm}
                onOpenChange={setShowAppointmentForm}
                onSuccess={() => {
                    setShowAppointmentForm(false);
                }}
            />
        </header>
    );
}