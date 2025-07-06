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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
  ColumnFiltersState,
  VisibilityState,
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import AppointmentForm from "./AppointmentForm";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Person {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  birth_date?: string;
  age?: string;
  contact_number?: string;
  address?: string;
}

interface Patient {
  id: number;
  person: Person;
}

interface Clinician {
  role: string;
  specialization: string;
  person: {
    first_name: string;
    middle_name: string | null;
    last_name: string;
  };
}

interface Appointment {
  id: string;
  patient_id: string;
  clinician_id: string;
  date: string;
  service: string;
  weight?: string | null;
  vitals?: string | null;
  gestational_age?: string | null;
  status: string;
  payment_status: string;
  patient?: Patient;
  clinician?: Clinician;
  patient_name?: string;
  clinician_name?: string;
}

interface AdvancedSearch {
  patient_name?: string;
  clinician_name?: string;
  service?: string;
  status?: string;
  payment_status?: string;
  date_filter?: string;
}

type Column = ColumnDef<Appointment> & {
  accessorFn?: (row: Appointment) => string;
};

// Helper functions to get names
const getPatientName = (appointment: Appointment) => {
  const person = appointment.patient?.person;
  if (!person) return "Unknown Patient";
  return `${person.first_name}${person.middle_name ? ` ${person.middle_name}` : ""} ${person.last_name}`;
};

const getClinicianName = (appointment: Appointment) => {
  const person = appointment.clinician?.person;
  if (!person) return "Unknown Clinician";
  return `${person.first_name}${person.middle_name ? ` ${person.middle_name}` : ""} ${person.last_name}`;
};

const columns: ColumnDef<Appointment>[] = [
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
    accessorKey: "patient_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Patient Name
        {column.getIsSorted() === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("patient_name")}</div>,
  },
  {
    accessorKey: "clinician_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Clinician Name
        {column.getIsSorted() === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === "desc" ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("clinician_name")}</div>,
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date
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
      <div>{new Date(row.getValue("date")).toLocaleDateString()}</div>
    ),
    sortingFn: (rowA, rowB, columnId) => {
      return new Date(rowA.getValue(columnId)).getTime() - new Date(rowB.getValue(columnId)).getTime();
    },
  },
  {
    accessorKey: "service",
    header: "Service",
    cell: ({ row }) => <div>{row.getValue("service")}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant="outline"
          className="flex gap-1 px-1.5 text-muted-foreground [&_svg]:size-3"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              status.toLowerCase() === "completed"
                ? "bg-green-400"
                : status.toLowerCase() === "scheduled"
                ? "bg-blue-400"
                : "bg-red-400"
            }`}
          />
          <span className="hidden sm:inline">{status}</span>
        </Badge>
      );
    },
  },
  {
    accessorKey: "payment_status",
    header: "Payment Status",
    cell: ({ row }) => {
      const status = row.getValue("payment_status") as string;
      return (
        <Badge
          variant="outline"
          className="flex gap-1 px-1.5 text-muted-foreground [&_svg]:size-3"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              status.toLowerCase() === "paid"
                ? "bg-green-400"
                : status.toLowerCase() === "pending"
                ? "bg-yellow-400"
                : status.toLowerCase() === "partial"
                ? "bg-orange-400"
                : "bg-red-400"
            }`}
          />
          <span className="hidden sm:inline">{status}</span>
        </Badge>
      );
    },
  },
];

export default function AppointmentsTable() {
  const router = useRouter();
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [advancedSearch, setAdvancedSearch] = React.useState<AdvancedSearch>({});
  const [tab, setTab] = React.useState("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [showAppointmentForm, setShowAppointmentForm] = React.useState(false);
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    status: "all" as "all" | "scheduled" | "completed" | "canceled",
    sort: "none" as "none" | "asc" | "desc",
    limit: "",
    exportFormat: "csv" as "csv" | "pdf",
    exportContent: {
      appointmentInfo: true,
      patientInfo: false,
      clinicianInfo: false,
      vitals: false,
      prescriptions: false,
      supplements: false
    }
  });
  const { userData } = useCurrentUser();

  const columns: ColumnDef<Appointment>[] = [
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
      accessorKey: "patient_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Patient Name
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue("patient_name")}</div>,
    },
    {
      accessorKey: "clinician_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Clinician Name
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue("clinician_name")}</div>,
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
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
        <div>{new Date(row.getValue("date")).toLocaleDateString()}</div>
      ),
      sortingFn: (rowA, rowB, columnId) => {
        return new Date(rowA.getValue(columnId)).getTime() - new Date(rowB.getValue(columnId)).getTime();
      },
    },
    {
      accessorKey: "service",
      header: "Service",
      cell: ({ row }) => <div>{row.getValue("service")}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const appointment = row.original;
        const validStatuses = ["Scheduled", "Completed", "Canceled"];
        const updateAppointmentStatus = async (newStatus: "Scheduled" | "Completed" | "Canceled") => {
          if (!validStatuses.includes(newStatus)) {
            toast.error("Invalid status value.");
            return false;
          }
          try {
            // Optimistically update local state
            setAppointments((prev) =>
              prev.map((appt) =>
                appt.id === appointment.id ? { ...appt, status: newStatus } : appt
              )
            );

            const { error } = await supabase
              .from("appointment")
              .update({ status: newStatus })
              .eq("id", appointment.id);

            if (error) {
              // Revert optimistic update on error
              setAppointments((prev) =>
                prev.map((appt) =>
                  appt.id === appointment.id ? { ...appt, status: appointment.status } : appt
                )
              );
              console.error("Appointment status update error:", error);
              toast.error(`Failed to update appointment status: ${error.message}`);
              return false;
            }

            toast.success("Status Updated", {
              description: `Appointment status changed to ${newStatus}.`,
            });
            return true;
          } catch (err) {
            // Revert optimistic update on unexpected error
            setAppointments((prev) =>
              prev.map((appt) =>
                appt.id === appointment.id ? { ...appt, status: appointment.status } : appt
              )
            );
            console.error("Unexpected error updating status:", err);
            toast.error("An unexpected error occurred while updating the status.");
            return false;
          }
        };

        const debouncedUpdateAppointmentStatus = debounce(updateAppointmentStatus, 300);

        return (
          <Select
            value={appointment.status || "Scheduled"}
            onValueChange={async (value) => {
              const newStatus = value as "Scheduled" | "Completed" | "Canceled";
              const success = await debouncedUpdateAppointmentStatus(newStatus);
              if (!success) {
                fetchAppointments();
              }
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Scheduled" className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                Scheduled
              </SelectItem>
              <SelectItem value="Completed" className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                Completed
              </SelectItem>
              <SelectItem value="Canceled" className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                Canceled
              </SelectItem>
            </SelectContent>
          </Select>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "payment_status",
      header: "Payment Status",
      cell: ({ row }) => {
        const appointment = row.original;
        const validPaymentStatuses = ["Pending", "Paid", "Unpaid"];
        const updatePaymentStatus = async (newStatus: "Pending" | "Paid" | "Unpaid") => {
          if (!validPaymentStatuses.includes(newStatus)) {
            toast.error("Invalid payment status value.");
            return false;
          }
          try {
            // Optimistically update local state
            setAppointments((prev) =>
              prev.map((appt) =>
                appt.id === appointment.id ? { ...appt, payment_status: newStatus } : appt
              )
            );

            const { error } = await supabase
              .from("appointment")
              .update({ payment_status: newStatus })
              .eq("id", appointment.id);

            if (error) {
              // Revert optimistic update on error
              setAppointments((prev) =>
                prev.map((appt) =>
                  appt.id === appointment.id ? { ...appt, payment_status: appointment.payment_status } : appt
                )
              );
              console.error("Payment status update error:", error);
              toast.error(`Failed to update payment status: ${error.message}`);
              return false;
            }

            toast.success("Payment Status Updated", {
              description: `Payment status changed to ${newStatus}.`,
            });
            return true;
          } catch (err) {
            // Revert optimistic update on unexpected error
            setAppointments((prev) =>
              prev.map((appt) =>
                appt.id === appointment.id ? { ...appt, payment_status: appointment.payment_status } : appt
              )
            );
            console.error("Unexpected error updating payment status:", err);
            toast.error("An unexpected error occurred while updating the payment status.");
            return false;
          }
        };

        const debouncedUpdatePaymentStatus = debounce(updatePaymentStatus, 300);

        return (
          <Select
            value={appointment.payment_status || "Pending"}
            onValueChange={async (value) => {
              const newStatus = value as "Pending" | "Paid" | "Unpaid";
              const success = await debouncedUpdatePaymentStatus(newStatus);
              if (!success) {
                fetchAppointments();
              }
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select payment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending" className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                Pending
              </SelectItem>
              <SelectItem value="Paid" className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                Paid
              </SelectItem>
              <SelectItem value="Unpaid" className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                Unpaid
              </SelectItem>
            </SelectContent>
          </Select>
        );
      },
      enableSorting: false,
    },
  ];

  // Fetch appointments from Supabase
  const fetchAppointments = React.useCallback(async () => {
    if (!userData) return;

    setLoading(true);
    let isMounted = true;
    try {
      let query = supabase
        .from("appointment")
        .select(`
          *,
          patients:patient_id (
            person (
              id,
              first_name,
              middle_name,
              last_name,
              birth_date,
              age,
              contact_number,
              address
            )
          ),
          clinicians:clinician_id (
            role,
            specialization,
            person (
              first_name,
              middle_name,
              last_name
            )
          )
        `);

      if (!userData.isAdmin && userData.clinicianId) {
        query = query.eq('clinician_id', userData.clinicianId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (isMounted) {
        // Transform the data and pre-compute names
        const transformedData = data.map((appointment) => {
          const patientName = appointment.patients?.person ? 
            `${appointment.patients.person.first_name}${appointment.patients.person.middle_name ? ` ${appointment.patients.person.middle_name}` : ""} ${appointment.patients.person.last_name}`.trim() : 
            "Unknown Patient";
          
          const clinicianName = appointment.clinicians?.person ? 
            `${appointment.clinicians.person.first_name}${appointment.clinicians.person.middle_name ? ` ${appointment.clinicians.person.middle_name}` : ""} ${appointment.clinicians.person.last_name}`.trim() : 
            "Unknown Clinician";

          return {
            ...appointment,
            patient_name: patientName,
            clinician_name: clinicianName,
            patient: appointment.patients ? {
              id: appointment.patients.person.id,
              person: appointment.patients.person
            } : undefined,
            clinician: appointment.clinicians ? {
              role: appointment.clinicians.role,
              specialization: appointment.clinicians.specialization,
              person: appointment.clinicians.person
            } : undefined
          };
        });

        setAppointments(transformedData);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to fetch appointments');
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, [userData]);
  
  React.useEffect(() => {
    fetchAppointments();
  
    // No need to handle isMounted here since fetchAppointments is stable
  }, [fetchAppointments]);

  // Update the filteredAppointments logic
  const filteredAppointments = React.useMemo(() => {
    console.log('Filtering appointments in table:', { tab, searchTerm, advancedSearch });
    console.log('Current appointments:', appointments);
    
    let result = [...appointments];

    // Apply search term
    if (searchTerm) {
      result = result.filter(
        (appointment) =>
          appointment.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.clinician_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.service?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply advanced search
    if (advancedSearch.service && advancedSearch.service !== "all_services") {
      result = result.filter((appointment) =>
        appointment.service.toLowerCase() === advancedSearch.service?.toLowerCase()
      );
    }
    if (advancedSearch.status && advancedSearch.status !== "all_statuses") {
      result = result.filter((appointment) =>
        appointment.status.toLowerCase() === advancedSearch.status?.toLowerCase()
      );
    }
    if (advancedSearch.payment_status && advancedSearch.payment_status !== "all_payment_statuses") {
      result = result.filter((appointment) =>
        appointment.payment_status.toLowerCase() === advancedSearch.payment_status?.toLowerCase()
      );
    }

    // Apply date filter
    if (advancedSearch.date_filter && advancedSearch.date_filter !== "all_dates") {
      const now = new Date();
      const appointmentDate = new Date();
      
      result = result.filter((appointment) => {
        appointmentDate.setTime(new Date(appointment.date).getTime());
        
        switch (advancedSearch.date_filter) {
          case "today":
            return appointmentDate.toDateString() === now.toDateString();
          case "yesterday":
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            return appointmentDate.toDateString() === yesterday.toDateString();
          case "past_week":
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return appointmentDate >= weekAgo;
          case "past_month":
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return appointmentDate >= monthAgo;
          case "past_3_months":
            const threeMonthsAgo = new Date(now);
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            return appointmentDate >= threeMonthsAgo;
          case "past_6_months":
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return appointmentDate >= sixMonthsAgo;
          case "past_year":
            const yearAgo = new Date(now);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return appointmentDate >= yearAgo;
          case "this_week":
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
          case "this_month":
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            return appointmentDate >= startOfMonth && appointmentDate <= endOfMonth;
          default:
            return true;
        }
      });
    }

    // Apply tab filter
    if (tab === "scheduled") {
      result = result.filter((appointment) => appointment.status.toLowerCase() === "scheduled");
    } else if (tab === "completed") {
      result = result.filter((appointment) => appointment.status.toLowerCase() === "completed");
    } else if (tab === "canceled") {
      result = result.filter((appointment) => appointment.status.toLowerCase() === "canceled");
    }

    console.log('Filtered result:', result);
    return result;
  }, [appointments, searchTerm, advancedSearch, tab]);

  // Add effect to refetch data periodically
  React.useEffect(() => {
    fetchAppointments();
    
    // Refetch every 5 minutes
    const interval = setInterval(fetchAppointments, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  // Sort appointments
  const sortedAppointments = React.useMemo(() => {
    if (!sorting.length) return filteredAppointments;

    return [...filteredAppointments].sort((a, b) => {
      const { id, desc } = sorting[0]; // Only use the first sorting criteria for better performance
      
      let aValue: any;
      let bValue: any;
      
      // Handle special cases for different columns
      switch (id) {
        case "date":
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case "patient_name":
          aValue = a.patient_name?.toLowerCase() || "";
          bValue = b.patient_name?.toLowerCase() || "";
          break;
        case "clinician_name":
          aValue = a.clinician_name?.toLowerCase() || "";
          bValue = b.clinician_name?.toLowerCase() || "";
          break;
        default:
          aValue = (a as any)[id];
          bValue = (b as any)[id];
      }

      // Handle undefined/null values
      if (aValue === undefined || aValue === null) aValue = "";
      if (bValue === undefined || bValue === null) bValue = "";

      // Compare values
      const sortOrder = desc ? -1 : 1;
      return aValue < bValue ? -sortOrder : aValue > bValue ? sortOrder : 0;
    });
  }, [filteredAppointments, sorting]);

  // Initialize table with optimized configuration
  const table = useReactTable({
    data: sortedAppointments,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    // Add these options for better performance
    enableMultiSort: false,
    manualSorting: false,
    sortDescFirst: false,
  });

  // Update the getExportAppointments function
  const getExportAppointments = async () => {
    try {
      console.log("Starting export with filters:", exportFilters);
      // First get the filtered appointments
      let result = [...filteredAppointments];

      // Apply date filters
      if (exportFilters.startDate || exportFilters.endDate) {
        result = result.filter((appointment) => {
          const apptDate = new Date(appointment.date);
          const start = exportFilters.startDate
            ? new Date(exportFilters.startDate).setHours(0, 0, 0, 0)
            : -Infinity;
          const end = exportFilters.endDate
            ? new Date(exportFilters.endDate).setHours(23, 59, 59, 999)
            : Infinity;
          return apptDate.getTime() >= start && apptDate.getTime() <= end;
        });
      }

      // Apply status filter
      if (exportFilters.status !== "all") {
        result = result.filter((appointment) =>
          appointment.status.toLowerCase() === exportFilters.status
        );
      }

      // Apply sorting
      if (exportFilters.sort !== "none") {
        result.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return exportFilters.sort === "asc" ? dateA - dateB : dateB - dateA;
        });
      }

      // Apply limit BEFORE fetching details
      if (exportFilters.limit) {
        const limit = parseInt(exportFilters.limit);
        if (!isNaN(limit) && limit > 0) {
          console.log(`Limiting results to ${limit} appointments`);
          result = result.slice(0, limit);
        }
      }

      console.log(`Processing ${result.length} appointments for export`);

      // Now fetch complete data for each filtered appointment
      const appointmentsWithDetails = await Promise.all(
        result.map(async (appointment) => {
          console.log(`Fetching details for appointment ${appointment.id}`);
          // Fetch appointment with related data
          const { data: appointmentData, error: appointmentError } = await supabase
            .from("appointment")
            .select(`
              *,
              patients:patient_id (
                person (
                  id,
                  first_name,
                  middle_name,
                  last_name,
                  birth_date,
                  age,
                  contact_number,
                  address
                )
              ),
              clinicians:clinician_id (
                role,
                specialization,
                person (
                  id,
                  first_name,
                  middle_name,
                  last_name
                )
              )
            `)
            .eq("id", appointment.id)
            .single();

          if (appointmentError) throw appointmentError;

          // Fetch vitals data
          const { data: vitalsData, error: vitalsError } = await supabase
            .from("vitals")
            .select(`
              id,
              temperature,
              pulse_rate,
              blood_pressure,
              respiration_rate,
              oxygen_saturation
            `)
            .eq("id", appointment.id)
            .single();

          if (vitalsError && vitalsError.code !== "PGRST116") {
            console.error("Error fetching vitals:", vitalsError);
          }

          // Fetch prescriptions if selected
          let prescriptionsData = null;
          if (exportFilters.exportContent.prescriptions) {
            console.log(`Fetching prescriptions for patient ${appointmentData.patient_id}`);
            const { data: prescriptions, error: prescriptionsError } = await supabase
              .from("prescriptions")
              .select(`
                id,
                name,
                strength,
                amount,
                frequency,
                route,
                status,
                date,
                patient_id,
                clinician_id
              `)
              .eq("patient_id", appointmentData.patient_id);

            if (prescriptionsError) {
              console.error("Error fetching prescriptions:", prescriptionsError);
            } else {
              console.log(`Found ${prescriptions?.length || 0} prescriptions for patient ${appointmentData.patient_id}`);
              prescriptionsData = prescriptions;
            }
          }

          // Fetch supplements if selected
          let supplementsData = null;
          if (exportFilters.exportContent.supplements) {
            console.log(`Fetching supplements for patient ${appointmentData.patient_id}`);
            const { data: supplements, error: supplementsError } = await supabase
              .from("supplements")
              .select(`
                id,
                name,
                strength,
                amount,
                frequency,
                route,
                status,
                date,
                patient_id
              `)
              .eq("patient_id", appointmentData.patient_id);

            if (supplementsError) {
              console.error("Error fetching supplements:", supplementsError);
            } else {
              console.log(`Found ${supplements?.length || 0} supplements for patient ${appointmentData.patient_id}`);
              supplementsData = supplements;
            }
          }

          // Combine all data
          const combinedData = {
            ...appointmentData,
            vitals: vitalsData || null,
            prescriptions: prescriptionsData,
            supplements: supplementsData,
            patient: appointmentData?.patients ? {
              id: appointmentData.patients.person.id,
              person: appointmentData.patients.person
            } : null,
            clinician: appointmentData?.clinicians ? {
              role: appointmentData.clinicians.role,
              specialization: appointmentData.clinicians.specialization,
              person: appointmentData.clinicians.person
            } : null
          };

          console.log("Combined data for appointment:", appointment.id, {
            hasVitals: !!vitalsData,
            prescriptionCount: prescriptionsData?.length || 0,
            supplementCount: supplementsData?.length || 0
          });

          return combinedData;
        })
      );

      console.log(`Completed processing ${appointmentsWithDetails.length} appointments`);
      return appointmentsWithDetails;
    } catch (error) {
      console.error("Error in getExportAppointments:", error);
      toast.error("Error preparing export data");
      return [];
    }
  };

  // Update the handleExport function
  const handleExport = async () => {
    try {
      console.log("Starting export process with filters:", exportFilters);
      const appointmentsToExport = await getExportAppointments();
      console.log(`Preparing to export ${appointmentsToExport.length} appointments`);

      try {
        if (exportFilters.exportFormat === "csv") {
          // Declare and initialize headers array before using it
          const headers: string[] = [];

          if (exportFilters.exportContent.appointmentInfo) {
            headers.push("Date", "Service", "Status", "Payment Status");
          }

          if (exportFilters.exportContent.patientInfo) {
            headers.push(
              "Patient Name",
              "Patient Birth Date",
              "Patient Age",
              "Patient Contact",
              "Patient Address"
            );
          }

          if (exportFilters.exportContent.clinicianInfo) {
            headers.push("Clinician Name", "Role", "Specialization");
          }

          if (exportFilters.exportContent.vitals) {
            headers.push(
              "Weight",
              "Gestational Age",
              "Temperature",
              "Pulse Rate",
              "Blood Pressure",
              "Respiration Rate",
              "Oxygen Saturation"
            );
          }

          if (exportFilters.exportContent.prescriptions) {
            headers.push(
              "Prescription Name",
              "Strength",
              "Amount",
              "Frequency",
              "Route",
              "Prescription Status",
              "Date Prescribed"
            );
          }

          if (exportFilters.exportContent.supplements) {
            headers.push(
              "Supplement Name",
              "Strength",
              "Amount",
              "Frequency",
              "Route",
              "Supplement Status",
              "Date Recommended"
            );
          }

          // Generate rows
          const rows = appointmentsToExport.map(appointment => {
            const row: string[] = [];
            
            if (exportFilters.exportContent.appointmentInfo) {
              row.push(
                new Date(appointment.date).toLocaleString(),
                appointment.service || "",
                appointment.status || "",
                appointment.payment_status || ""
              );
            }
            
            if (exportFilters.exportContent.patientInfo) {
              const patientPerson = appointment.patient?.person || {
                first_name: "",
                middle_name: null,
                last_name: "",
                birth_date: "",
                age: null,
                contact_number: null,
                address: null
              };
              row.push(
                `${patientPerson.first_name || ""} ${patientPerson.middle_name || ""} ${patientPerson.last_name || ""}`.trim(),
                patientPerson.birth_date ? new Date(patientPerson.birth_date).toLocaleDateString() : "",
                patientPerson.age || "",
                patientPerson.contact_number || "",
                patientPerson.address || ""
              );
            }
            
            if (exportFilters.exportContent.clinicianInfo) {
              const clinicianData = appointment.clinician || {
                role: "",
                specialization: "",
                person: {
                  first_name: "",
                  middle_name: null,
                  last_name: ""
                }
              };
              row.push(
                `${clinicianData.person.first_name || ""} ${clinicianData.person.middle_name || ""} ${clinicianData.person.last_name || ""}`.trim(),
                clinicianData.role || "",
                clinicianData.specialization || ""
              );
            }
            
            if (exportFilters.exportContent.vitals) {
              const vitalsData = appointment.vitals || {
                temperature: null,
                pulse_rate: null,
                blood_pressure: null,
                respiration_rate: null,
                oxygen_saturation: null
              };
              row.push(
                appointment.weight || "",
                appointment.gestational_age || "",
                vitalsData.temperature || "",
                vitalsData.pulse_rate || "",
                vitalsData.blood_pressure || "",
                vitalsData.respiration_rate || "",
                vitalsData.oxygen_saturation || ""
              );
            }

            if (exportFilters.exportContent.prescriptions) {
              const prescription = appointment.prescriptions?.[0] || {};
              row.push(
                prescription.name || "",
                prescription.strength || "",
                prescription.amount || "",
                prescription.frequency || "",
                prescription.route || "",
                prescription.status || "",
                prescription.date ? new Date(prescription.date).toLocaleDateString() : ""
              );
            }

            if (exportFilters.exportContent.supplements) {
              const supplement = appointment.supplements?.[0] || {};
              row.push(
                supplement.name || "",
                supplement.strength || "",
                supplement.amount || "",
                supplement.frequency || "",
                supplement.route || "",
                supplement.status || "",
                supplement.date ? new Date(supplement.date).toLocaleDateString() : ""
              );
            }
            
            return row;
          });

          // Create CSV content
          const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
          ].join("\n");

          // Download CSV file
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const link = document.createElement("a");
          const today = new Date().toISOString().split('T')[0];
          link.href = URL.createObjectURL(blob);
          link.download = `appointments_export_${today}.csv`;
          link.click();
          toast.success("CSV exported successfully.");
          setOpenExportDialog(false);
        } else if (exportFilters.exportFormat === "pdf") {
          for (const appointment of appointmentsToExport) {
            console.log(`Exporting PDF for appointment ${appointment.id}`, {
              hasVitals: !!appointment.vitals,
              prescriptionCount: appointment.prescriptions?.length || 0,
              supplementCount: appointment.supplements?.length || 0
            });

            const exportData = {
              appointment,
              exportOptions: exportFilters.exportContent
            };

            const response = await fetch("/api/export/appointment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(exportData),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `Failed to export PDF for appointment on ${new Date(appointment.date).toLocaleDateString()}`);
            }

            const pdfBlob = await response.blob();
            const url = window.URL.createObjectURL(pdfBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Appointment_Report_${new Date(appointment.date).toLocaleDateString()}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
          }

          toast.success("PDF(s) exported successfully.");
          setOpenExportDialog(false);
        }
      } catch (error) {
        console.error("Export failed:", error);
        toast.error(`Failed to generate export: ${(error as Error).message}`);
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(`Failed to generate export: ${(error as Error).message}`);
    }
  };

  return (
    <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 data-[state=inactive]:text-gray-600 transition-all duration-200"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="scheduled" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-50 data-[state=active]:to-blue-100 data-[state=active]:text-blue-800 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 transition-all duration-200 data-[state=active]:border-l-4 data-[state=active]:border-l-blue-500"
            >
              Scheduled
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-50 data-[state=active]:to-green-100 data-[state=active]:text-green-800 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 transition-all duration-200 data-[state=active]:border-l-4 data-[state=active]:border-l-green-500"
            >
              Completed
            </TabsTrigger>
            <TabsTrigger 
              value="canceled" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-50 data-[state=active]:to-red-100 data-[state=active]:text-red-800 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 transition-all duration-200 data-[state=active]:border-l-4 data-[state=active]:border-l-red-500"
            >
              Canceled
            </TabsTrigger>
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
                <div className="p-2 space-y-2">
                  <Select
                    value={advancedSearch.service || ""}
                    onValueChange={(value) =>
                      setAdvancedSearch({
                        ...advancedSearch,
                        service: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_services">All Services</SelectItem>
                      <SelectItem value="Prenatal Care">Prenatal Care</SelectItem>
                      <SelectItem value="Postpartum Care">Postpartum Care</SelectItem>
                      <SelectItem value="Consultation">Consultation</SelectItem>
                      <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                      <SelectItem value="Lab Test">Lab Test</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={advancedSearch.status || ""}
                    onValueChange={(value) =>
                      setAdvancedSearch({
                        ...advancedSearch,
                        status: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_statuses">All Statuses</SelectItem>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={advancedSearch.payment_status || ""}
                    onValueChange={(value) =>
                      setAdvancedSearch({
                        ...advancedSearch,
                        payment_status: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_payment_statuses">All Payment Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={advancedSearch.date_filter || ""}
                    onValueChange={(value) =>
                      setAdvancedSearch({
                        ...advancedSearch,
                        date_filter: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_dates">All Dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="past_6_months">Past 6 Months</SelectItem>
                      <SelectItem value="past_year">Past 1 Year</SelectItem>
                      <SelectItem value="past_3_years">Past 3 Years</SelectItem>
                      <SelectItem value="past_5_years">Past 5 Years</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <DialogTitle>Export Appointments</DialogTitle>
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="selectAllContent"
                            checked={Object.values(exportFilters.exportContent).every(Boolean)}
                            onCheckedChange={(checked) =>
                              setExportFilters({
                                ...exportFilters,
                                exportContent: {
                                  appointmentInfo: !!checked,
                                  patientInfo: !!checked,
                                  clinicianInfo: !!checked,
                                  vitals: !!checked,
                                  prescriptions: !!checked,
                                  supplements: !!checked,
                                },
                              })
                            }
                          />
                          <Label htmlFor="selectAllContent">Select All</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="appointmentInfo"
                            checked={exportFilters.exportContent.appointmentInfo}
                            onCheckedChange={(checked) =>
                              setExportFilters({
                                ...exportFilters,
                                exportContent: {
                                  ...exportFilters.exportContent,
                                  appointmentInfo: !!checked,
                                },
                              })
                            }
                          />
                          <Label htmlFor="appointmentInfo">Appointment Information</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="patientInfo"
                            checked={exportFilters.exportContent.patientInfo}
                            onCheckedChange={(checked) =>
                              setExportFilters({
                                ...exportFilters,
                                exportContent: {
                                  ...exportFilters.exportContent,
                                  patientInfo: !!checked,
                                },
                              })
                            }
                          />
                          <Label htmlFor="patientInfo">Patient Information</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="clinicianInfo"
                            checked={exportFilters.exportContent.clinicianInfo}
                            onCheckedChange={(checked) =>
                              setExportFilters({
                                ...exportFilters,
                                exportContent: {
                                  ...exportFilters.exportContent,
                                  clinicianInfo: !!checked,
                                },
                              })
                            }
                          />
                          <Label htmlFor="clinicianInfo">Clinician Information</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="vitals"
                            checked={exportFilters.exportContent.vitals}
                            onCheckedChange={(checked) =>
                              setExportFilters({
                                ...exportFilters,
                                exportContent: {
                                  ...exportFilters.exportContent,
                                  vitals: !!checked,
                                },
                              })
                            }
                          />
                          <Label htmlFor="vitals">Vitals</Label>
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
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
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
                      <Label>End Date</Label>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={exportFilters.status}
                        onValueChange={(value) =>
                          setExportFilters({
                            ...exportFilters,
                            status: value as "all" | "scheduled" | "completed" | "canceled",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="canceled">Canceled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sort by Date</Label>
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
                          <SelectItem value="asc">Oldest First</SelectItem>
                          <SelectItem value="desc">Newest First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Export Limit</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 10"
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
                  <Button onClick={handleExport}>Export</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value={tab}>
          <Card x-chunk="dashboard-06-chunk-0">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <CardTitle>Appointments</CardTitle>
                <CardDescription>Manage your appointments and view their details.</CardDescription>
              </div>

              <div className="relative flex items-center w-full max-w-sm md:w-auto">
                <Button
                  size="sm"
                  className="h-8 ml-2 flex items-center gap-1"
                  onClick={() => setShowAppointmentForm(true)}
                >
                  <UserRoundPlus />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    New Appointment
                  </span>
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-sm text-muted-foreground">Loading appointments...</div>
                </div>
              ) : filteredAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No appointments found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => {
                        const appointment = row.original;
                        const getStatusGradientStyle = (status: string) => {
                          switch (status.toLowerCase()) {
                            case "scheduled":
                              return {
                                backgroundImage:
                                  "linear-gradient(to right, #e0f2fe 0%, #f0f9ff 8%, transparent 12%, transparent 100%)",
                              };
                            case "completed":
                              return {
                                backgroundImage:
                                  "linear-gradient(to right, #dcfce7 0%, #f0fdf4 8%, transparent 12%, transparent 100%)",
                              };
                            case "canceled":
                              return {
                                backgroundImage:
                                  "linear-gradient(to right, #fee2e2 0%, #fef2f2 8%, transparent 12%, transparent 100%)",
                              };
                            default:
                              return {};
                          }
                        };

                        return (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            className="cursor-pointer hover:bg-muted/50 relative"
                            style={getStatusGradientStyle(appointment.status)}
                            onClick={() =>
                              router.push(`/Dashboard/Appointments/Appointment-View?id=${row.original.id}`)
                            }
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
              {!loading && (
                <div className="flex items-center justify-between w-full">
                  <div className="text-xs text-muted-foreground">
                    Showing <strong>{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredAppointments.length)}</strong> of{" "}
                    <strong>{appointments.length}</strong> appointments
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
                    <div className="flex items-center gap-1">
                      <div className="text-xs text-muted-foreground">Page</div>
                      <strong className="text-sm">
                        {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount()}
                      </strong>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      Next
                    </Button>
                    <Select
                      value={`${table.getState().pagination.pageSize}`}
                      onValueChange={(value) => {
                        table.setPageSize(Number(value));
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={table.getState().pagination.pageSize} />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[10, 20, 30, 40, 50].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <AppointmentForm
        open={showAppointmentForm}
        onOpenChange={setShowAppointmentForm}
        onSuccess={() => {
          fetchAppointments();
        }}
      />
    </main>
  );
}

// Simple debounce implementation for async functions
function debounce<T extends (...args: any[]) => Promise<any>>(fn: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastPromise: Promise<any> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    return new Promise<ReturnType<T>>((resolve, reject) => {
      timeout = setTimeout(() => {
        lastPromise = fn(...args)
          .then(resolve)
          .catch(reject);
      }, wait);
    });
  };
}
