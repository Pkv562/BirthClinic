"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Eye,
    Download,
    ListFilter,
    MoreHorizontal,
    Search,
    Trash2,
    UserRoundPlus,
    ChevronDownIcon,
    TextSearch,
    ArrowUpDown,
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

interface Patient {
    id: number;
    name: string;
    status: string;
    birth_date: string | null;
    age: string | null;
    last_appointment: string | null;
    contact_number: string | null;
    address: string | null;
}

interface ExportPatientData {
    first_name: string;
    middle_name: string;
    last_name: string;
    birth_date: string | null;
    age: string | null;
    contact_number: string | null;
    address: string | null;
    status: string;
}

interface ExportContent {
    appointments: boolean;
    supplements: boolean;
    prescriptions: boolean;
    labRecords: boolean;
}

interface ExportData {
    patient: ExportPatientData;
    exportOptions: ExportContent;
    appointments?: Array<Record<string, unknown>>;
    supplements?: Array<Record<string, unknown>>;
    prescriptions?: Array<Record<string, unknown>>;
    labRecords?: Array<Record<string, unknown>>;
}

const columns: ColumnDef<Patient>[] = [
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
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const patient = row.original;
            const updatePatientStatus = async (newStatus: "Active" | "Inactive") => {
                try {
                    console.log(`Updating status for patient ID ${patient.id} to ${newStatus}`);
                    const { error } = await supabase
                        .from("person")
                        .update({ status: newStatus })
                        .eq("id", patient.id);

                    if (error) {
                        console.error("Patient status update error:", error);
                        toast.error(`Failed to update patient status: ${error.message}`);
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
                    value={patient.status || "Unknown"}
                    onValueChange={async (value) => {
                        const newStatus = value as "Active" | "Inactive";
                        const success = await updatePatientStatus(newStatus);
                        if (success) {
                            (window as any).updatePatientsState(patient.id, newStatus);
                            toast.success("Status Updated", {
                                description: `Patient status changed to ${newStatus}.`,
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
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="hidden sm:block">{row.getValue("last_appointment") || "-"}</div>
        ),
    },
    {
        accessorKey: "birth_date",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="hidden md:flex"
            >
                Birth Date
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="hidden md:block">{row.getValue("birth_date") || "-"}</div>
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
                <ArrowUpDown className="ml-2 h-4 w-4" />
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
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="hidden md:block">{row.getValue("address") || "-"}</div>
        ),
    },
];

export default function PatientsTable() {
    const router = useRouter();
    const [patients, setPatients] = React.useState<Patient[]>([]);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [advancedSearch, setAdvancedSearch] = React.useState({
        last_appointment: "",
        birth_date: "",
        age: "",
        contact: "",
        address: "",
    });
    const [tab, setTab] = React.useState("all");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState({});
    const [exportFilters, setExportFilters] = React.useState({
        startDate: undefined as Date | undefined,
        endDate: undefined as Date | undefined,
        minAge: "",
        maxAge: "",
        status: "all" as "all" | "active" | "inactive",
        sort: "none" as "none" | "asc" | "desc",
        limit: "",
        exportFormat: "csv" as "csv" | "pdf",
        onlyWithAppointments: false,
        exportContent: {
            basicInfo: true,
            appointments: false,
            supplements: false,
            prescriptions: false,
            labRecords: false,
        }
    });
    const [openExportDialog, setOpenExportDialog] = useState(false);
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    // Expose update function to window for column access
    React.useEffect(() => {
        (window as any).updatePatientsState = (patientId: number, newStatus: "Active" | "Inactive") => {
            setPatients((prev) =>
                prev.map((p) =>
                    p.id === patientId ? { ...p, status: newStatus } : p
                )
            );
        };

        return () => {
            delete (window as any).updatePatientsState;
        };
    }, []);

    React.useEffect(() => {
        async function fetchPatients() {
            try {
                const { data: patientsData, error: patientsError } = await supabase
                    .from("patients")
                    .select(`
                        id,
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

                if (patientsError) {
                    console.error("Patients fetch error:", patientsError);
                    toast.error(`Failed to fetch patients: ${patientsError.message}`);
                    return;
                }

                if (!patientsData || patientsData.length === 0) {
                    toast.info("No patients found.");
                    setPatients([]);
                    return;
                }

                const patientIds = patientsData.map((p: any) => p.id);

                // Fetch the latest appointment date for each patient
                const { data: appointmentsData, error: appointmentsError } = await supabase
                    .from("appointment")
                    .select("patient_id, date")
                    .in("patient_id", patientIds)
                    .order("date", { ascending: false });

                if (appointmentsError) {
                    console.warn(`Failed to fetch appointments: ${appointmentsError.message}`);
                    toast.warning(`Failed to fetch appointments: ${appointmentsError.message}`);
                }

                // Create a map of patient_id to latest appointment date
                const latestAppointments = new Map<number, string>();
                appointmentsData?.forEach((appt: any) => {
                    if (!latestAppointments.has(appt.patient_id)) {
                        latestAppointments.set(appt.patient_id, appt.date);
                    }
                });

                const formattedPatients: Patient[] = patientsData.map((patient: any) => {
                    const person = patient.person || {};
                    const lastAppointment = latestAppointments.get(patient.id);

                    return {
                        id: patient.id,
                        name: person.first_name
                            ? `${person.first_name} ${person.middle_name || ""} ${person.last_name || ""}`
                            : "Unknown",
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

                setPatients(formattedPatients);
                toast.success("Patients fetched successfully.");
            } catch (err: any) {
                console.error("Error fetching patients:", err);
                toast.error(`Error fetching patients: ${err.message}`);
            }
        }

        fetchPatients();
    }, []);

    const filteredPatients = React.useMemo(() => {
        let result = [...patients];

        if (searchTerm) {
            result = result.filter((patient) =>
                patient.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (advancedSearch.last_appointment) {
            result = result.filter((patient) => {
                if (!patient.last_appointment) return false;
                return patient.last_appointment.toLowerCase().includes(advancedSearch.last_appointment.toLowerCase());
            });
        }
        if (advancedSearch.birth_date) {
            result = result.filter((patient) =>
                patient.birth_date?.toLowerCase().includes(advancedSearch.birth_date.toLowerCase())
            );
        }
        if (advancedSearch.age) {
            result = result.filter((patient) =>
                patient.age?.toLowerCase().includes(advancedSearch.age.toLowerCase())
            );
        }
        if (advancedSearch.contact) {
            result = result.filter((patient) =>
                patient.contact_number?.toLowerCase().includes(advancedSearch.contact.toLowerCase())
            );
        }
        if (advancedSearch.address) {
            result = result.filter((patient) =>
                patient.address?.toLowerCase().includes(advancedSearch.address.toLowerCase())
            );
        }

        if (tab === "active") {
            result = result.filter((patient) => patient.status.toLowerCase() === "active");
        } else if (tab === "inactive") {
            result = result.filter((patient) => patient.status.toLowerCase() === "inactive");
        }

        return result;
    }, [searchTerm, advancedSearch, tab, patients]);

    const getExportPatients = () => {
        let result = [...filteredPatients];
        console.log('Initial patients count:', result.length);

        // Filter patients with appointments if the option is selected
        if (exportFilters.onlyWithAppointments) {
            result = result.filter(patient => patient.last_appointment !== null);
            console.log('Patients with appointments:', result.length);
        }

        if (exportFilters.startDate || exportFilters.endDate) {
            result = result.filter((patient) => {
                if (!patient.last_appointment) return false;
                
                try {
                    // Parse the appointment date and time
                    const [datePart, timePart] = patient.last_appointment.split(' at ');
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
            result = result.filter((patient) => {
                if (!patient.age) return false;
                const age = parseInt(patient.age);
                const min = exportFilters.minAge ? parseInt(exportFilters.minAge) : -Infinity;
                const max = exportFilters.maxAge ? parseInt(exportFilters.maxAge) : Infinity;
                return age >= min && age <= max;
            });
        }

        if (exportFilters.status !== "all") {
            result = result.filter((patient) =>
                patient.status.toLowerCase() === exportFilters.status
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

        console.log('Final export patients:', result);
        return result;
    };

    const handleExport = async () => {
        const patientsToExport = getExportPatients();
        console.log('Patients to export:', patientsToExport.length);
        
        if (patientsToExport.length === 0) {
            toast.error("No patients match the selected criteria for export");
            return;
        }
        
        if (exportFilters.exportFormat === "csv") {
            try {
                // For each patient, fetch their additional data based on export content options
                const allPatientsData = await Promise.all(patientsToExport.map(async (patient) => {
                    const patientData: any = {
                        basic: {
                            name: patient.name,
                            status: patient.status,
                            last_appointment: patient.last_appointment || "",
                            birth_date: patient.birth_date || "",
                            age: patient.age || "",
                            contact_number: patient.contact_number || "",
                            address: patient.address || ""
                        }
                    };

                    // Fetch appointments if needed
                    if (exportFilters.exportContent.appointments) {
                        const { data: appointments } = await supabase
                            .from("appointment")
                            .select(`
                                *,
                                clinicians!clinician_id (
                                    person (
                                        first_name,
                                        middle_name,
                                        last_name
                                    )
                                )
                            `)
                            .eq("patient_id", patient.id);
                        patientData.appointments = appointments || [];
                    }

                    // Fetch supplements if needed
                    if (exportFilters.exportContent.supplements) {
                        const { data: supplements } = await supabase
                            .from("supplements")
                            .select(`
                                *,
                                clinicians (
                                    person (
                                        first_name,
                                        middle_name,
                                        last_name
                                    )
                                )
                            `)
                            .eq("patient_id", patient.id);
                        patientData.supplements = supplements || [];
                    }

                    // Fetch prescriptions if needed
                    if (exportFilters.exportContent.prescriptions) {
                        const { data: prescriptions } = await supabase
                            .from("prescriptions")
                            .select(`
                                *,
                                clinicians!clinician_id (
                                    person (
                                        first_name,
                                        middle_name,
                                        last_name
                                    )
                                )
                            `)
                            .eq("patient_id", patient.id);
                        patientData.prescriptions = prescriptions || [];
                    }

                    // Fetch lab records if needed
                    if (exportFilters.exportContent.labRecords) {
                        const { data: labRecords } = await supabase
                            .from("laboratory_records")
                            .select("*")
                            .eq("patient_id", patient.id);
                        patientData.labRecords = labRecords || [];
                    }

                    return patientData;
                }));

                // Generate CSV content
                let csvContent = "";
                let headers: string[] = [];
                let rows: string[][] = [];

                // Add basic info headers if selected
                if (exportFilters.exportContent.basicInfo) {
                    headers = headers.concat([
                        "Name",
                        "Status",
                        "Last Appointment",
                        "Birth Date",
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
                        "Appointment Clinician"
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
                        "Supplement Clinician",
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
                        "Prescription Clinician",
                        "Prescription Date"
                    ]);
                }

                // Add lab records headers if selected
                if (exportFilters.exportContent.labRecords) {
                    headers = headers.concat([
                        "Lab Record Type",
                        "Lab Record Doctor",
                        "Lab Record Company",
                        "Lab Record Ordered Date",
                        "Lab Record Received Date",
                        "Lab Record Reported Date",
                        "Lab Record Impressions",
                        "Lab Record Remarks",
                        "Lab Record Recommendations"
                    ]);
                }

                // Process each patient's data
                allPatientsData.forEach((patientData) => {
                    const maxRows = Math.max(
                        1,
                        exportFilters.exportContent.appointments ? patientData.appointments?.length || 0 : 0,
                        exportFilters.exportContent.supplements ? patientData.supplements?.length || 0 : 0,
                        exportFilters.exportContent.prescriptions ? patientData.prescriptions?.length || 0 : 0,
                        exportFilters.exportContent.labRecords ? patientData.labRecords?.length || 0 : 0
                    );

                    // Create rows for each patient
                    for (let i = 0; i < maxRows; i++) {
                        const row: string[] = [];

                        // Add basic info (only on first row)
                        if (exportFilters.exportContent.basicInfo) {
                            if (i === 0) {
                                row.push(
                                    patientData.basic.name,
                                    patientData.basic.status,
                                    patientData.basic.last_appointment,
                                    patientData.basic.birth_date,
                                    patientData.basic.age,
                                    patientData.basic.contact_number,
                                    patientData.basic.address
                                );
                            } else {
                                row.push("", "", "", "", "", "", "");
                            }
                        }

                        // Add appointment data
                        if (exportFilters.exportContent.appointments) {
                            const appointment = patientData.appointments[i] || {};
                            row.push(
                                appointment.date || "",
                                appointment.service || "",
                                appointment.status || "",
                                appointment.payment_status || "",
                                appointment.clinicians?.person ? 
                                    `${appointment.clinicians.person.first_name} ${appointment.clinicians.person.last_name}` : ""
                            );
                        }

                        // Add supplement data
                        if (exportFilters.exportContent.supplements) {
                            const supplement = patientData.supplements[i] || {};
                            row.push(
                                supplement.name || "",
                                supplement.strength || "",
                                supplement.amount || "",
                                supplement.frequency || "",
                                supplement.route || "",
                                supplement.status || "",
                                supplement.clinicians?.person ?
                                    `${supplement.clinicians.person.first_name} ${supplement.clinicians.person.last_name}` : "",
                                supplement.date || ""
                            );
                        }

                        // Add prescription data
                        if (exportFilters.exportContent.prescriptions) {
                            const prescription = patientData.prescriptions[i] || {};
                            row.push(
                                prescription.name || "",
                                prescription.strength || "",
                                prescription.amount || "",
                                prescription.frequency || "",
                                prescription.route || "",
                                prescription.status || "",
                                prescription.clinicians?.person ?
                                    `${prescription.clinicians.person.first_name} ${prescription.clinicians.person.last_name}` : "",
                                prescription.date || ""
                            );
                        }

                        // Add lab record data
                        if (exportFilters.exportContent.labRecords) {
                            const labRecord = patientData.labRecords[i] || {};
                            row.push(
                                labRecord.type || "",
                                labRecord.doctor || "",
                                labRecord.company || "",
                                labRecord.ordered_date || "",
                                labRecord.received_date || "",
                                labRecord.reported_date || "",
                                labRecord.impressions || "",
                                labRecord.remarks || "",
                                labRecord.recommendations || ""
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
                const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
                link.href = URL.createObjectURL(csvBlob);
                link.download = `patients_export_${today}.csv`;
                link.click();
                toast.success("CSV exported successfully.");
                setOpenExportDialog(false);
            } catch (error) {
                console.error("CSV export failed:", error);
                toast.error(`Failed to generate CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        } else {
            try {
                // For each patient, fetch their additional data based on export content options
                for (const patient of patientsToExport) {
                    console.log('Processing patient for PDF:', patient.name);
                    const exportData: ExportData = {
                        patient: {
                            first_name: patient.name.split(" ")[0],
                            middle_name: patient.name.split(" ").length > 2 ? patient.name.split(" ")[1] : "",
                            last_name: patient.name.split(" ").pop() || "",
                            birth_date: patient.birth_date,
                            age: patient.age,
                            contact_number: patient.contact_number,
                            address: patient.address,
                            status: patient.status
                        },
                        exportOptions: exportFilters.exportContent
                    };

                    // Fetch appointments if needed
                    if (exportFilters.exportContent.appointments) {
                        const { data: appointments } = await supabase
                            .from("appointment")
                            .select(`
                                *,
                                clinicians!clinician_id (
                                    person (
                                        first_name,
                                        middle_name,
                                        last_name
                                    )
                                )
                            `)
                            .eq("patient_id", patient.id);
                        exportData.appointments = appointments || [];
                    }

                    // Fetch supplements if needed
                    if (exportFilters.exportContent.supplements) {
                        const { data: supplements } = await supabase
                            .from("supplements")
                            .select(`
                                *,
                                clinicians (
                                    person (
                                        first_name,
                                        middle_name,
                                        last_name
                                    )
                                )
                            `)
                            .eq("patient_id", patient.id);
                        exportData.supplements = supplements || [];
                    }

                    // Fetch prescriptions if needed
                    if (exportFilters.exportContent.prescriptions) {
                        const { data: prescriptions } = await supabase
                            .from("prescriptions")
                            .select(`
                                *,
                                clinicians!clinician_id (
                                    person (
                                        first_name,
                                        middle_name,
                                        last_name
                                    )
                                )
                            `)
                            .eq("patient_id", patient.id);
                        exportData.prescriptions = prescriptions || [];
                    }

                    // Fetch lab records if needed
                    if (exportFilters.exportContent.labRecords) {
                        const { data: labRecords } = await supabase
                            .from("laboratory_records")
                            .select("*")
                            .eq("patient_id", patient.id);
                        exportData.labRecords = labRecords || [];
                    }

                    // Generate PDF using the export API
                    const response = await fetch("/api/export", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(exportData),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || `Failed to export PDF for ${patient.name}`);
                    }

                    const pdfBlob = await response.blob();
                    const url = window.URL.createObjectURL(pdfBlob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `Patient_Report_${patient.name}_${new Date().toISOString().split('T')[0]}.pdf`;
                    document.body.appendChild(a); // Add to document
                    a.click();
                    document.body.removeChild(a); // Remove from document
                    window.URL.revokeObjectURL(url);
                }

                toast.success(`Successfully exported ${patientsToExport.length} patient(s) to PDF`);
                setOpenExportDialog(false);
            } catch (error) {
                console.error("Export failed:", error);
                toast.error(`Failed to generate export: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    };

    const table = useReactTable({
        data: filteredPatients,
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

    return (
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            <Tabs value={tab} onValueChange={setTab}>
                <div className="flex items-center">
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="inactive">Inactive</TabsTrigger>
                    </TabsList>

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
                                        placeholder="Birth Date..."
                                        value={advancedSearch.birth_date}
                                        onChange={(e) =>
                                            setAdvancedSearch({
                                                ...advancedSearch,
                                                birth_date: e.target.value,
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
                                    <DialogTitle>Export Patients</DialogTitle>
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
                                                                    labRecords: !!checked,
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
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="labRecords"
                                                        checked={exportFilters.exportContent.labRecords}
                                                        onCheckedChange={(checked) =>
                                                            setExportFilters({
                                                                ...exportFilters,
                                                                exportContent: {
                                                                    ...exportFilters.exportContent,
                                                                    labRecords: !!checked,
                                                                },
                                                            })
                                                        }
                                                    />
                                                    <Label htmlFor="labRecords">Laboratory Records</Label>
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
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                            <Label htmlFor="onlyWithAppointments">Only Patients with Appointments</Label>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button onClick={handleExport}>Export</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <TabsContent value={tab}>
                    <Card x-chunk="dashboard-06-chunk-alda">
                        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                                <CardTitle>Patients</CardTitle>
                                <CardDescription>
                                    Manage your patients and view their records.
                                </CardDescription>
                            </div>

                            <div className="relative flex items-center w-full max-w-sm md:w-auto">
                                <Button
                                    size="sm"
                                    className="h-8 ml-2 flex items-center gap-1"
                                    onClick={() => router.push("/Dashboard/Patients/Patient-Form")}
                                >
                                    <UserRoundPlus />
                                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                        Add Patient
                                    </span>
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent>
                            {filteredPatients.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No patients found.
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
                                            table.getRowModel().rows.map((row) => (
                                                <TableRow
                                                    key={row.id}
                                                    data-state={row.getIsSelected() && "selected"}
                                                    onClick={() => router.push(`/Dashboard/Patients/Patient-View?id=${row.original.id}`)}
                                                    className="cursor-pointer hover:bg-zinc-100"
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
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={columns.length}
                                                    className="h-24 text-center"
                                                >
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
                                Showing <strong>{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredPatients.length)}</strong> of{" "}
                                <strong>{patients.length}</strong> patients
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