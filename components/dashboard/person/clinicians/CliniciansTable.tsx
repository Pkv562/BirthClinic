"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Eye,
    Download,
    ListFilter,
    Search,
    Trash2,
    UserRoundPlus,
    ChevronDownIcon,
    TextSearch,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import {
    ColumnDef,
    SortingState,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    flexRender,
    getPaginationRowModel,
} from "@tanstack/react-table";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface Clinician {
    id: number;
    name: string;
    role: string;
    password: string;
    specialization: string;
    status: string;
    birth_date: string | null;
    age: string | null;
    last_appointment: string | null;
    contact_number: string | null;
    address: string | null;
}

const columns: ColumnDef<Clinician>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
    },
    {
        accessorKey: "name",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Name
                {column.getIsSorted() === "asc" ? (
                    <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                    <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
            </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
            const role = row.getValue("role") as string;
            return (
                <div className="font-medium">
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                </div>
            );
        },
        enableSorting: false,
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const clinician = row.original;
            const updateClinicianStatus = async (newStatus: "Active" | "Inactive") => {
                try {
                    console.log(`Updating status for clinician ID ${clinician.id} to ${newStatus}`);
                    const { error } = await supabase
                        .from("person")
                        .update({ status: newStatus })
                        .eq("id", clinician.id);

                    if (error) {
                        console.error("Clinician status update error:", error);
                        toast.error(`Failed to update clinician status: ${error.message}`);
                        return false;
                    }

                    return true;
                } catch (err) {
                    console.error("Unexpected error updating status:", err);
                    toast.error("An unexpected error occurred while updating the status.");
                    return false;
                }
            };

            return (
                <Select
                    value={clinician.status || "Unknown"}
                    onValueChange={async (value) => {
                        const newStatus = value as "Active" | "Inactive";
                        const success = await updateClinicianStatus(newStatus);
                        if (success) {
                            (window as any).updateCliniciansState(clinician.id, newStatus);
                            toast.success("Status Updated", {
                                description: `Clinician status changed to ${newStatus}.`,
                            });
                        }
                    }}
                >
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Active" className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400" />
                            Active
                        </SelectItem>
                        <SelectItem value="Inactive" className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            Inactive
                        </SelectItem>
                    </SelectContent>
                </Select>
            );
        },
        enableSorting: false,
    },
    {
        accessorKey: "last_appointment",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="hidden sm:flex"
            >
                Last Appointment
                {column.getIsSorted() === "asc" ? (
                    <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                    <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
            </Button>
        ),
        cell: ({ row }) => (
            <div className="hidden sm:block">{row.getValue("last_appointment") || "-"}</div>
        ),
    },
    {
        accessorKey: "age",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="hidden md:flex"
            >
                Age
                {column.getIsSorted() === "asc" ? (
                    <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                    <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
            </Button>
        ),
        cell: ({ row }) => <div className="hidden md:block">{row.getValue("age") || "-"}</div>,
    },
    {
        accessorKey: "contact_number",
        header: () => <div className="hidden md:block">Contact Number</div>,
        cell: ({ row }) => (
            <div className="hidden md:block">{row.getValue("contact_number") || "-"}</div>
        ),
        enableSorting: false,
    },
    {
        accessorKey: "address",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="hidden md:flex"
            >
                Home Address
                {column.getIsSorted() === "asc" ? (
                    <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                    <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
            </Button>
        ),
        cell: ({ row }) => (
            <div className="hidden md:block">{row.getValue("address") || "-"}</div>
        ),
    },
];

export default function CliniciansTable() {
    const router = useRouter();
    const [clinicians, setClinicians] = React.useState<Clinician[]>([]);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [advancedSearch, setAdvancedSearch] = React.useState({
        last_appointment: "",
        age: "",
        contact: "",
        address: "",
    });
    const [tab, setTab] = React.useState("all");
    const [roleFilter, setRoleFilter] = React.useState("all");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState({});
    const [userData, setUserData] = React.useState<any>(null);
    const [openExportDialog, setOpenExportDialog] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });
    const [exportFilters, setExportFilters] = useState({
        startDate: undefined as Date | undefined,
        endDate: undefined as Date | undefined,
        minAge: "",
        maxAge: "",
        status: "all" as "all" | "active" | "inactive",
        role: "all" as "all" | "doctor" | "midwife",
        sort: "none" as "none" | "asc" | "desc",
        limit: "",
        onlyWithAppointments: false,
        exportFormat: "csv" as "csv" | "pdf",
        exportContent: {
            basicInfo: true,
            appointments: false,
            supplements: false,
            prescriptions: false
        }
    });

    // Expose update function to window for column access
    React.useEffect(() => {
        (window as any).updateCliniciansState = (clinicianId: number, newStatus: "Active" | "Inactive") => {
            setClinicians((prev) =>
                prev.map((c) =>
                    c.id === clinicianId ? { ...c, status: newStatus } : c
                )
            );
        };

        return () => {
            delete (window as any).updateCliniciansState;
        };
    }, []);

    // Get user data from session storage
    React.useEffect(() => {
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            setUserData(JSON.parse(storedUser));
        }
    }, []);

    // Fetch clinicians from Supabase
    React.useEffect(() => {
        async function fetchClinicians() {
            try {
                const { data: cliniciansData, error: cliniciansError } = await supabase
                    .from("clinicians")
                    .select(`
                        id,
                        role,
                        password,
                        specialization,
                        person (
                            id,
                            first_name,
                            middle_name,
                            last_name,
                            birth_date,
                            age,
                            status,
                            contact_number,
                            address
                        )
                    `);

                if (cliniciansError) {
                    toast.error(`Failed to fetch clinicians: ${cliniciansError.message}`);
                    return;
                }

                if (!cliniciansData || cliniciansData.length === 0) {
                    toast.info("No clinicians found.");
                    setClinicians([]);
                    return;
                }

                const clinicianIds = cliniciansData.map((p: any) => p.id);
                const { data: appointmentsData, error: appointmentsError } = await supabase
                    .from("appointment")
                    .select("clinician_id, date")
                    .in("clinician_id", clinicianIds)
                    .order('date', { ascending: false });

                if (appointmentsError) {
                    toast.warning(`Failed to fetch appointments: ${appointmentsError.message}`);
                }

                const formattedClinicians: Clinician[] = cliniciansData.map((clinician: any) => {
                    const person = clinician.person || {};
                    const appointments = appointmentsData
                        ?.filter((a: any) => a.clinician_id === clinician.id)
                        .sort(
                            (a: any, b: any) =>
                                new Date(b.date).getTime() - new Date(a.date).getTime()
                        );

                    const lastAppointment = appointments?.[0]?.date;

                    return {
                        id: clinician.id,
                        name: person.first_name
                            ? `${person.first_name} ${person.middle_name || ""} ${person.last_name || ""}`
                            : "Unknown",
                        role: clinician.role || "doctor",
                        password: clinician.password || "",
                        specialization: clinician.specialization || "",
                        status: person.status || "Unknown",
                        birth_date: person.birth_date
                            ? new Date(person.birth_date).toLocaleDateString("en-US", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                              })
                            : null,
                        age: person.age || null,
                        last_appointment: lastAppointment
                            ? new Date(lastAppointment).toLocaleString("en-US", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                              })
                            : null,
                        contact_number: person.contact_number || null,
                        address: person.address || null,
                    };
                });

                setClinicians(formattedClinicians);
                toast.success("Clinicians fetched successfully.");
            } catch (err: any) {
                toast.error(`Error fetching clinicians: ${err.message}`);
            }
        }

        fetchClinicians();
    }, []);

    // Handle search and filtering
    const filteredClinicians = React.useMemo(() => {
        let result = [...clinicians];

        // Apply search term
        if (searchTerm) {
            result = result.filter((clinician) =>
                clinician.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply advanced search
        if (advancedSearch.last_appointment) {
            result = result.filter((clinician) => {
                if (!clinician.last_appointment) return false;
                return clinician.last_appointment.toLowerCase().includes(advancedSearch.last_appointment.toLowerCase());
            });
        }
        if (advancedSearch.age) {
            result = result.filter((clinician) =>
                clinician.age?.toLowerCase().includes(advancedSearch.age.toLowerCase())
            );
        }
        if (advancedSearch.contact) {
            result = result.filter((clinician) =>
                clinician.contact_number?.toLowerCase().includes(advancedSearch.contact.toLowerCase())
            );
        }
        if (advancedSearch.address) {
            result = result.filter((clinician) =>
                clinician.address?.toLowerCase().includes(advancedSearch.address.toLowerCase())
            );
        }

        // Apply tab filter
        if (tab === "active") {
            result = result.filter((clinician) => clinician.status.toLowerCase() === "active");
        } else if (tab === "inactive") {
            result = result.filter((clinician) => clinician.status.toLowerCase() === "inactive");
        }

        // Apply role filter
        if (roleFilter === "doctor") {
            result = result.filter((clinician) => clinician.role.toLowerCase() === "doctor");
        } else if (roleFilter === "midwife") {
            result = result.filter((clinician) => clinician.role.toLowerCase() === "midwife");
        }

        return result;
    }, [searchTerm, advancedSearch, tab, roleFilter, clinicians]);

    // Initialize table
    const table = useReactTable({
        data: filteredClinicians,
        columns,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onRowSelectionChange: setRowSelection,
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
        state: {
            sorting,
            rowSelection,
            pagination,
        },
    });

    const getExportClinicians = () => {
        let result = [...filteredClinicians];

        // Filter clinicians with appointments if the option is selected
        if (exportFilters.onlyWithAppointments) {
            result = result.filter(clinician => clinician.last_appointment !== null);
        }

        if (exportFilters.startDate || exportFilters.endDate) {
            result = result.filter((clinician) => {
                if (!clinician.last_appointment) return false;
                
                try {
                    // Parse the appointment date and time
                    const [datePart, timePart] = clinician.last_appointment.split(' at ');
                    const [month, day, year] = datePart.split(' ');
                    
                    // Convert month name to month number
                    const months = {
                        'January': 0, 'February': 1, 'March': 2, 'April': 3,
                        'May': 4, 'June': 5, 'July': 6, 'August': 7,
                        'September': 8, 'October': 9, 'November': 10, 'December': 11
                    };
                    
                    // Create date object from appointment
                    const apptDate = new Date(
                        parseInt(year),
                        months[month as keyof typeof months],
                        parseInt(day)
                    );
                    
                    // Create date objects from filters
                    const startDate = exportFilters.startDate ? new Date(exportFilters.startDate) : null;
                    const endDate = exportFilters.endDate ? new Date(exportFilters.endDate) : null;
                    
                    // Set times for consistent comparison
                    apptDate.setHours(0, 0, 0, 0);
                    if (startDate) startDate.setHours(0, 0, 0, 0);
                    if (endDate) endDate.setHours(23, 59, 59, 999);
                    
                    // Compare dates
                    if (startDate && endDate) {
                        return apptDate >= startDate && apptDate <= endDate;
                    } else if (startDate) {
                        return apptDate >= startDate;
                    } else if (endDate) {
                        return apptDate <= endDate;
                    }
                    
                    return true;
                } catch (error) {
                    console.error('Error parsing date:', error);
                    return false;
                }
            });
        }

        if (exportFilters.minAge || exportFilters.maxAge) {
            result = result.filter((clinician) => {
                if (!clinician.age) return false;
                const age = parseInt(clinician.age);
                const min = exportFilters.minAge ? parseInt(exportFilters.minAge) : -Infinity;
                const max = exportFilters.maxAge ? parseInt(exportFilters.maxAge) : Infinity;
                return age >= min && age <= max;
            });
        }

        if (exportFilters.status !== "all") {
            result = result.filter((clinician) =>
                clinician.status.toLowerCase() === exportFilters.status
            );
        }

        if (exportFilters.role !== "all") {
            result = result.filter((clinician) =>
                clinician.role.toLowerCase() === exportFilters.role
            );
        }

        if (exportFilters.sort !== "none") {
            result.sort((a, b) => {
                const comparison = a.name.localeCompare(b.name);
                return exportFilters.sort === "asc" ? comparison : -comparison;
            });
        }

        if (exportFilters.limit) {
            const limit = parseInt(exportFilters.limit);
            if (!isNaN(limit) && limit > 0) {
                result = result.slice(0, limit);
            }
        }

        return result;
    };

    const handleExport = async () => {
        const cliniciansToExport = getExportClinicians();
        
        if (exportFilters.exportFormat === "csv") {
            try {
                // For each clinician, fetch their additional data based on export content options
                const allCliniciansData = await Promise.all(cliniciansToExport.map(async (clinician) => {
                    const nameParts = clinician.name.split(" ").filter(Boolean);
                    const clinicianData: any = {
                        basic: {
                            name: clinician.name,
                            role: clinician.role || "",
                            status: clinician.status || "",
                            last_appointment: clinician.last_appointment || "",
                            age: clinician.age || "",
                            contact_number: clinician.contact_number || "",
                            address: clinician.address || ""
                        }
                    };

                    // Fetch appointments if needed
                    if (exportFilters.exportContent.appointments) {
                        const { data: appointments } = await supabase
                            .from("appointment")
                            .select(`
                                *,
                                patients!patient_id (
                                    person (
                                        first_name,
                                        middle_name,
                                        last_name
                                    )
                                )
                            `)
                            .eq("clinician_id", clinician.id);
                        clinicianData.appointments = appointments || [];
                    }

                    // Fetch supplements if needed
                    if (exportFilters.exportContent.supplements) {
                        const { data: supplements } = await supabase
                            .from("supplements")
                            .select(`
                                *,
                                patients (
                                    person (
                                        first_name,
                                        middle_name,
                                        last_name
                                    )
                                )
                            `)
                            .eq("clinician_id", clinician.id);
                        clinicianData.supplements = supplements || [];
                    }

                    // Fetch prescriptions if needed
                    if (exportFilters.exportContent.prescriptions && clinician.role === "Doctor") {
                        const { data: prescriptions } = await supabase
                            .from("prescriptions")
                            .select(`
                                *,
                                patients!patient_id (
                                    person (
                                        first_name,
                                        middle_name,
                                        last_name
                                    )
                                )
                            `)
                            .eq("clinician_id", clinician.id);
                        clinicianData.prescriptions = prescriptions || [];
                    }

                    return clinicianData;
                }));

                // Generate CSV content
                let csvContent = "";
                let headers: string[] = [];
                let rows: string[][] = [];

                // Add basic info headers if selected
                if (exportFilters.exportContent.basicInfo) {
                    headers = headers.concat([
                        "Name",
                        "Role",
                        "Status",
                        "Last Appointment",
                        "Age",
                        "Contact Number",
                        "Home Address"
                    ]);
                }

                // Add appointments headers if selected
                if (exportFilters.exportContent.appointments) {
                    headers = headers.concat([
                        "Appointment Date",
                        "Appointment Service",
                        "Appointment Status",
                        "Appointment Payment Status",
                        "Appointment Patient"
                    ]);
                }

                // Add supplements headers if selected
                if (exportFilters.exportContent.supplements) {
                    headers = headers.concat([
                        "Supplement Name",
                        "Supplement Strength",
                        "Supplement Amount",
                        "Supplement Frequency",
                        "Supplement Route",
                        "Supplement Status",
                        "Supplement Patient",
                        "Supplement Date"
                    ]);
                }

                // Add prescriptions headers if selected
                if (exportFilters.exportContent.prescriptions) {
                    headers = headers.concat([
                        "Prescription Name",
                        "Prescription Strength",
                        "Prescription Amount",
                        "Prescription Frequency",
                        "Prescription Route",
                        "Prescription Status",
                        "Prescription Patient",
                        "Prescription Date"
                    ]);
                }

                // Process each clinician's data
                allCliniciansData.forEach((clinicianData) => {
                    if (!clinicianData || !clinicianData.basic) return; // Skip if data is invalid

                    const maxRows = Math.max(
                        1,
                        exportFilters.exportContent.appointments ? (clinicianData.appointments?.length || 0) : 0,
                        exportFilters.exportContent.supplements ? (clinicianData.supplements?.length || 0) : 0,
                        exportFilters.exportContent.prescriptions ? (clinicianData.prescriptions?.length || 0) : 0
                    );

                    // Create rows for each clinician
                    for (let i = 0; i < maxRows; i++) {
                        const row: string[] = [];

                        // Add basic info (only on first row)
                        if (exportFilters.exportContent.basicInfo) {
                            if (i === 0) {
                                row.push(
                                    clinicianData.basic.name || "",
                                    clinicianData.basic.role || "",
                                    clinicianData.basic.status || "",
                                    clinicianData.basic.last_appointment || "",
                                    clinicianData.basic.age || "",
                                    clinicianData.basic.contact_number || "",
                                    clinicianData.basic.address || ""
                                );
                            } else {
                                row.push("", "", "", "", "", "", "");
                            }
                        }

                        // Add appointment data
                        if (exportFilters.exportContent.appointments) {
                            const appointment = clinicianData.appointments?.[i] || {};
                            const patientName = appointment.patients?.person ? 
                                `${appointment.patients.person.first_name || ''} ${appointment.patients.person.middle_name || ''} ${appointment.patients.person.last_name || ''}`.trim() : "";
                            row.push(
                                appointment.date || "",
                                appointment.service || "",
                                appointment.status || "",
                                appointment.payment_status || "",
                                patientName || ""
                            );
                        }

                        // Add supplement data
                        if (exportFilters.exportContent.supplements) {
                            const supplement = clinicianData.supplements?.[i] || {};
                            const patientName = supplement.patients?.person ? 
                                `${supplement.patients.person.first_name || ''} ${supplement.patients.person.middle_name || ''} ${supplement.patients.person.last_name || ''}`.trim() : "";
                            row.push(
                                supplement.name || "",
                                supplement.strength || "",
                                supplement.amount || "",
                                supplement.frequency || "",
                                supplement.route || "",
                                supplement.status || "",
                                patientName || "",
                                supplement.date || ""
                            );
                        }

                        // Add prescription data
                        if (exportFilters.exportContent.prescriptions) {
                            const prescription = clinicianData.prescriptions?.[i] || {};
                            const patientName = prescription.patients?.person ? 
                                `${prescription.patients.person.first_name || ''} ${prescription.patients.person.middle_name || ''} ${prescription.patients.person.last_name || ''}`.trim() : "";
                            row.push(
                                prescription.name || "",
                                prescription.strength || "",
                                prescription.amount || "",
                                prescription.frequency || "",
                                prescription.route || "",
                                prescription.status || "",
                                patientName || "",
                                prescription.date || ""
                            );
                        }

                        rows.push(row);
                    }
                });

                // Create CSV content
                csvContent = [
                    headers.join(","),
                    ...rows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
                ].join("\n");

                // Download CSV file
                const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                const today = new Date().toISOString().split('T')[0];
                link.href = URL.createObjectURL(csvBlob);
                link.download = `clinicians_export_${today}.csv`;
                link.click();
                toast.success("CSV exported successfully.");
                setOpenExportDialog(false);
            } catch (error: any) {
                console.error("CSV export failed:", error);
                toast.error(`Failed to generate CSV: ${error.message}`);
            }
        } else {
            try {
                let exportPromises = cliniciansToExport.map(async (clinician) => {
                    const exportData: any = {
                        clinician: {
                            first_name: clinician.name.split(" ")[0] || "",
                            middle_name: clinician.name.split(" ").length > 2 ? clinician.name.split(" ")[1] : "",
                            last_name: clinician.name.split(" ").pop() || "",
                            role: clinician.role || "",
                            status: clinician.status || "",
                            age: clinician.age || "",
                            contact_number: clinician.contact_number || "",
                            address: clinician.address || ""
                        },
                        exportOptions: exportFilters.exportContent
                    };

                    if (exportFilters.exportContent.appointments) {
                        const { data: appointments } = await supabase
                            .from("appointment")
                            .select(`
                                *,
                                patients!patient_id (
                                    person (
                                        first_name,
                                        middle_name,
                                        last_name
                                    )
                                )
                            `)
                            .eq("clinician_id", clinician.id);
                        exportData.appointments = appointments || [];
                    }

                    if (exportFilters.exportContent.supplements) {
                        const { data: supplements } = await supabase
                            .from("supplements")
                            .select(`
                                *,
                                patients (
                                    person (
                                        first_name,
                                        middle_name,
                                        last_name
                                    )
                                )
                            `)
                            .eq("clinician_id", clinician.id);
                        exportData.supplements = supplements || [];
                    }

                    if (exportFilters.exportContent.prescriptions && clinician.role === "Doctor") {
                        const { data: prescriptions } = await supabase
                            .from("prescriptions")
                            .select(`
                                *,
                                patients!patient_id (
                                    person (
                                        first_name,
                                        middle_name,
                                        last_name
                                    )
                                )
                            `)
                            .eq("clinician_id", clinician.id);
                        exportData.prescriptions = prescriptions || [];
                    }

                    try {
                        const response = await fetch("/api/export/clinician", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(exportData),
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || `Failed to export PDF for ${clinician.name}`);
                        }

                        const pdfBlob = await response.blob();
                        const url = window.URL.createObjectURL(pdfBlob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `Clinician_Report_${clinician.name}.pdf`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                        return true;
                    } catch (error) {
                        console.error(`Error exporting PDF for ${clinician.name}:`, error);
                        return false;
                    }
                });

                const results = await Promise.all(exportPromises);
                const successCount = results.filter(Boolean).length;
                
                if (successCount === cliniciansToExport.length) {
                    toast.success("All PDFs exported successfully.");
                } else if (successCount > 0) {
                    toast.warning(`${successCount} out of ${cliniciansToExport.length} PDFs exported successfully.`);
                } else {
                    toast.error("Failed to export any PDFs.");
                }
                
                setOpenExportDialog(false);
            } catch (error: any) {
                console.error("Export failed:", error);
                toast.error(`Failed to generate export: ${error.message}`);
            }
        }
    };

    return (
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            <Tabs value={tab} onValueChange={setTab}>
                <div className="flex items-center">
                    <div className="flex items-center gap-2">
                        <TabsList>
                            <TabsTrigger 
                                value="all" 
                                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 data-[state=inactive]:text-gray-600 transition-all duration-200"
                            >
                                All
                            </TabsTrigger>
                            <TabsTrigger 
                                value="active" 
                                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-50 data-[state=active]:to-green-100 data-[state=active]:text-green-800 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 transition-all duration-200 data-[state=active]:border-l-4 data-[state=active]:border-l-green-500"
                            >
                                Active
                            </TabsTrigger>
                            <TabsTrigger 
                                value="inactive" 
                                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-50 data-[state=active]:to-red-100 data-[state=active]:text-red-800 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 transition-all duration-200 data-[state=active]:border-l-4 data-[state=active]:border-l-red-500"
                            >
                                Inactive
                            </TabsTrigger>
                        </TabsList>

                        <Tabs value={roleFilter} onValueChange={setRoleFilter}>
                            <TabsList>
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="doctor">Doctor</TabsTrigger>
                                <TabsTrigger value="midwife">Midwife</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by name..."
                                className="w-full pl-8 rounded-lg bg-background"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <TextSearch />
                                    <span className="hidden lg:inline">Advanced Search</span>
                                    <span className="lg:hidden">Columns</span>
                                    <ChevronDownIcon />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <div className="p-2">
                                    <Input
                                        placeholder="Last appointment..."
                                        value={advancedSearch.last_appointment}
                                        onChange={(e) =>
                                            setAdvancedSearch({
                                                ...advancedSearch,
                                                last_appointment: e.target.value,
                                            })
                                        }
                                        className="mb-2"
                                    />
                                    <Input
                                        placeholder="Age..."
                                        value={advancedSearch.age}
                                        onChange={(e) =>
                                            setAdvancedSearch({
                                                ...advancedSearch,
                                                age: e.target.value,
                                            })
                                        }
                                        className="mb-2"
                                    />
                                    <Input
                                        placeholder="Phone number..."
                                        value={advancedSearch.contact}
                                        onChange={(e) =>
                                            setAdvancedSearch({
                                                ...advancedSearch,
                                                contact: e.target.value,
                                            })
                                        }
                                        className="mb-2"
                                    />
                                    <Input
                                        placeholder="Address..."
                                        value={advancedSearch.address}
                                        onChange={(e) =>
                                            setAdvancedSearch({
                                                ...advancedSearch,
                                                address: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Dialog open={openExportDialog} onOpenChange={setOpenExportDialog}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8 gap-1">
                                    <Download />
                                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                    <DialogTitle>Export Clinicians</DialogTitle>
                                    <DialogDescription>
                                        Customize your export by applying filters and selecting export options.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label>Export Format</Label>
                                            <Select
                                                value={exportFilters.exportFormat}
                                                onValueChange={(value) =>
                                                    setExportFilters({
                                                        ...exportFilters,
                                                        exportFormat: value as "csv" | "pdf",
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select format" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="csv">CSV</SelectItem>
                                                    <SelectItem value="pdf">PDF</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="onlyWithAppointments"
                                                    checked={exportFilters.onlyWithAppointments}
                                                    onCheckedChange={(checked) =>
                                                        setExportFilters({
                                                            ...exportFilters,
                                                            onlyWithAppointments: !!checked,
                                                        })
                                                    }
                                                />
                                                <Label htmlFor="onlyWithAppointments">Only Clinicians with Appointments</Label>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-6">
                                            <Label>Export Content</Label>
                                            <div className="grid grid-cols-3 gap-4">
                                                {/* First Row */}
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="selectAllContent"
                                                        checked={Object.values(exportFilters.exportContent).every(Boolean)}
                                                        onCheckedChange={(checked) =>
                                                            setExportFilters({
                                                                ...exportFilters,
                                                                exportContent: {
                                                                    basicInfo: !!checked,
                                                                    appointments: !!checked,
                                                                    supplements: !!checked,
                                                                    prescriptions: !!checked,
                                                                },
                                                            })
                                                        }
                                                    />
                                                    <Label htmlFor="selectAllContent">Select All</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="basicInfo"
                                                        checked={exportFilters.exportContent.basicInfo}
                                                        onCheckedChange={(checked) =>
                                                            setExportFilters({
                                                                ...exportFilters,
                                                                exportContent: {
                                                                    ...exportFilters.exportContent,
                                                                    basicInfo: !!checked,
                                                                },
                                                            })
                                                        }
                                                    />
                                                    <Label htmlFor="basicInfo">Basic Information</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="appointments"
                                                        checked={exportFilters.exportContent.appointments}
                                                        onCheckedChange={(checked) =>
                                                            setExportFilters({
                                                                ...exportFilters,
                                                                exportContent: {
                                                                    ...exportFilters.exportContent,
                                                                    appointments: !!checked,
                                                                },
                                                            })
                                                        }
                                                    />
                                                    <Label htmlFor="appointments">Appointments</Label>
                                                </div>

                                                {/* Second Row */}
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="supplements"
                                                        checked={exportFilters.exportContent.supplements}
                                                        onCheckedChange={(checked) =>
                                                            setExportFilters({
                                                                ...exportFilters,
                                                                exportContent: {
                                                                    ...exportFilters.exportContent,
                                                                    supplements: !!checked,
                                                                },
                                                            })
                                                        }
                                                    />
                                                    <Label htmlFor="supplements">Supplements</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="prescriptions"
                                                        checked={exportFilters.exportContent.prescriptions}
                                                        onCheckedChange={(checked) =>
                                                            setExportFilters({
                                                                ...exportFilters,
                                                                exportContent: {
                                                                    ...exportFilters.exportContent,
                                                                    prescriptions: !!checked,
                                                                },
                                                            })
                                                        }
                                                    />
                                                    <Label htmlFor="prescriptions">Prescriptions</Label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Last Appointment Start Date</Label>
                                            <DatePicker
                                                value={exportFilters.startDate}
                                                onChange={(date) =>
                                                    setExportFilters({
                                                        ...exportFilters,
                                                        startDate: date,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Last Appointment End Date</Label>
                                            <DatePicker
                                                value={exportFilters.endDate}
                                                onChange={(date) =>
                                                    setExportFilters({
                                                        ...exportFilters,
                                                        endDate: date,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Minimum Age</Label>
                                            <Input
                                                type="number"
                                                placeholder="e.g., 18"
                                                value={exportFilters.minAge}
                                                onChange={(e) =>
                                                    setExportFilters({
                                                        ...exportFilters,
                                                        minAge: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Maximum Age</Label>
                                            <Input
                                                type="number"
                                                placeholder="e.g., 65"
                                                value={exportFilters.maxAge}
                                                onChange={(e) =>
                                                    setExportFilters({
                                                        ...exportFilters,
                                                        maxAge: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <Label>Status</Label>
                                            <Select
                                                value={exportFilters.status}
                                                onValueChange={(value) =>
                                                    setExportFilters({
                                                        ...exportFilters,
                                                        status: value as "all" | "active" | "inactive",
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    <SelectItem value="active">Active</SelectItem>
                                                    <SelectItem value="inactive">Inactive</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Role</Label>
                                            <Select
                                                value={exportFilters.role}
                                                onValueChange={(value) =>
                                                    setExportFilters({
                                                        ...exportFilters,
                                                        role: value as "all" | "doctor" | "midwife",
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    <SelectItem value="doctor">Doctor</SelectItem>
                                                    <SelectItem value="midwife">Midwife</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sort by Name</Label>
                                            <Select
                                                value={exportFilters.sort}
                                                onValueChange={(value) =>
                                                    setExportFilters({
                                                        ...exportFilters,
                                                        sort: value as "none" | "asc" | "desc",
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select sorting" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">None</SelectItem>
                                                    <SelectItem value="asc">A-Z</SelectItem>
                                                    <SelectItem value="desc">Z-A</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Export Limit</Label>
                                            <Input
                                                type="number"
                                                placeholder="e.g., 3"
                                                value={exportFilters.limit}
                                                onChange={(e) =>
                                                    setExportFilters({
                                                        ...exportFilters,
                                                        limit: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button onClick={handleExport} disabled={isExporting}>
                                        {isExporting ? "Exporting..." : "Export"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <TabsContent value={tab}>
                    <Card x-chunk="dashboard-06-chunk-0">
                        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                                <CardTitle>Clinicians</CardTitle>
                                <CardDescription>
                                    Manage your clinicians and view their records.
                                </CardDescription>
                            </div>

                            <div className="relative flex items-center w-full max-w-sm md:w-auto">
                                {userData?.isAdmin && (
                                    <Button
                                        size="sm"
                                        className="h-8 ml-2 flex items-center gap-1"
                                        onClick={() => router.push("/Dashboard/Clinicians/Clinician-Form")}
                                    >
                                        <UserRoundPlus />
                                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                            Add Clinician
                                        </span>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent>
                            {filteredClinicians.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No clinicians found.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead key={header.id}>
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(
                                                                  header.column.columnDef.header,
                                                                  header.getContext()
                                                              )}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableHeader>
                                    <TableBody>
                                        {table.getRowModel().rows?.length ? (
                                            table.getRowModel().rows.map((row) => {
                                                const status = row.original.status?.toLowerCase();
                                                const getStatusGradientStyle = (status: string) => {
                                                    if (status === "active") {
                                                        return {
                                                            backgroundImage:
                                                                "linear-gradient(to right, #dcfce7 0%, #f0fdf4 8%, transparent 12%, transparent 100%)",
                                                        };
                                                    } else if (status === "inactive") {
                                                        return {
                                                            backgroundImage:
                                                                "linear-gradient(to right, #fee2e2 0%, #fef2f2 8%, transparent 12%, transparent 100%)",
                                                        };
                                                    } else {
                                                        return {};
                                                    }
                                                };
                                                return (
                                                    <TableRow
                                                        key={row.id}
                                                        data-state={row.getIsSelected() && "selected"}
                                                        onClick={() => router.push(`/Dashboard/Clinicians/Clinician-View?id=${row.original.id}`)}
                                                        className="cursor-pointer hover:bg-zinc-100"
                                                        style={getStatusGradientStyle(status)}
                                                    >
                                                        {row.getVisibleCells().map((cell) => (
                                                            <TableCell key={cell.id}>
                                                                {flexRender(
                                                                    cell.column.columnDef.cell,
                                                                    cell.getContext()
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                                    No results.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                        <CardFooter className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                                Showing <strong>{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredClinicians.length)}</strong> of{" "}
                                <strong>{clinicians.length}</strong> clinicians
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                >
                                    Next
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </main>
    );
}