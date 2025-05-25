"use client";

import { Download, Search, TextSearch, ChevronDownIcon, ArrowUpDown, UserRoundPlus, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { Users, Stethoscope, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { debounce } from "lodash";
import AppointmentForm from "@/components/dashboard/appointments/AppointmentForm";
import { ResponsiveContainer } from "recharts";
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
import { Label } from "@/components/ui/label";
import React from "react";

// Define the shape of the chart data
interface ChartData {
  age: string;
  numberOfPatients: number;
}

// Define the shape of clinician patient count data
interface ClinicianPatientCount {
  clinicianName: string;
  numberOfPatients: number;
}

// Define the shape of the appointment data
interface Appointment {
  id: string;
  patient_id: string;
  clinician_id: string;
  date: string;
  service: string;
  weight: string | null;
  vitals: string | null;
  gestational_age: string | null;
  status: "Scheduled" | "Completed" | "Canceled";
  payment_status: "Pending" | "Paid" | "Unpaid";
  patient_name: string;
  clinician_name: string;
}

interface ClinicianPerson {
  first_name: string;
  middle_name: string | null;
  last_name: string;
}

interface ClinicianWithPatients {
  id: string;
  person: ClinicianPerson;
  appointments: { patient_id: string }[];
}

export default function Dashboard() {
  const router = useRouter();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [clinicianData, setClinicianData] = useState<ClinicianPatientCount[]>([]);
  const [chartView, setChartView] = useState<"age" | "clinician">("age");
  const [activePatients, setActivePatients] = useState<number>(0);
  const [activeClinicians, setActiveClinicians] = useState<number>(0);
  const [totalAppointments, setTotalAppointments] = useState<number>(0);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [advancedSearch, setAdvancedSearch] = useState<{
    service?: string;
    status?: string;
    payment_status?: string;
  }>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    overview: true,
    ageDistribution: false,
    clinicianDistribution: false,
    appointments: false
  });
  const [exportFormat, setExportFormat] = useState("pdf");

  // Fetch data from Supabase
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active patients
      const { data: patientsData, error: patientsError } = await supabase
        .from("person")
        .select("id")
        .eq("status", "Active")
        .in("id", (await supabase.from("patients").select("id")).data?.map(p => p.id) || []);

      if (patientsError) throw new Error(`Patients query error: ${patientsError.message}`);
      setActivePatients(patientsData?.length || 0);

      // Fetch active clinicians
      const { data: cliniciansData, error: cliniciansError } = await supabase
        .from("person")
        .select("id")
        .eq("status", "Active")
        .in("id", (await supabase.from("clinicians").select("id")).data?.map(c => c.id) || []);

      if (cliniciansError) throw new Error(`Clinicians query error: ${cliniciansError.message}`);
      setActiveClinicians(cliniciansData?.length || 0);

      // Fetch total appointments count
      const { count: appointmentsCount, error: appointmentsError } = await supabase
        .from("appointment")
        .select("*", { count: "exact", head: true });

      if (appointmentsError) throw new Error(`Appointments query error: ${appointmentsError.message}`);
      setTotalAppointments(appointmentsCount || 0);

      // Fetch patient age distribution
      const { data: ageData, error: ageError } = await supabase
        .from("person")
        .select("age")
        .not("age", "is", null)
        .in("id", (await supabase.from("patients").select("id")).data?.map(p => p.id) || []);

      if (ageError) throw new Error(`Age distribution query error: ${ageError.message}`);
      if (!ageData || ageData.length === 0) {
        setChartData([]);
        setError("No patient data found");
      } else {
        // Aggregate age data
        const ageCounts = ageData.reduce((acc: { [key: string]: number }, row) => {
          const age = row.age.toString();
          acc[age] = (acc[age] || 0) + 1;
          return acc;
        }, {});

        // Convert to chart data format and sort
        const formattedData = Object.entries(ageCounts)
          .map(([age, count]) => ({
            age,
            numberOfPatients: count,
          }))
          .sort((a, b) => a.age.localeCompare(b.age, undefined, { numeric: true }));

        setChartData(formattedData);
      }

      // Fetch clinician-patient distribution
      const { data: clinicianPatientData, error: clinicianPatientError } = await supabase
        .from("clinicians")
        .select(`
          id,
          person!id (
            first_name,
            middle_name,
            last_name
          ),
          appointments:appointment!clinician_id (
            patient_id
          )
        `);

      if (clinicianPatientError) throw new Error(`Clinician-patient query error: ${clinicianPatientError.message}`);
      
      if (clinicianPatientData) {
        // Process and aggregate clinician-patient data
        const clinicianCounts = (clinicianPatientData as unknown as ClinicianWithPatients[]).map(clinician => {
          // Use only first name
          const firstName = clinician.person.first_name;
          
          // Count unique patients for each clinician
          const uniquePatients = new Set(clinician.appointments?.map(p => p.patient_id) || []);
          
          return {
            clinicianName: firstName,
            numberOfPatients: uniquePatients.size
          };
        });

        // Sort by number of patients and get top 5
        const top5Clinicians = clinicianCounts
          .sort((a, b) => b.numberOfPatients - a.numberOfPatients)
          .slice(0, 5);

        setClinicianData(top5Clinicians);
      }

      // Get today's date in UTC
      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      const todayEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1));

      console.log('Fetching appointments between:', todayStart.toISOString(), 'and', todayEnd.toISOString());

      const { data: appointmentsData, error: todayAppointmentsError } = await supabase
        .from("appointment")
        .select(`
          *,
          patient:patient_id (
            person (
              first_name,
              middle_name,
              last_name
            )
          ),
          clinician:clinician_id (
            person (
              first_name,
              middle_name,
              last_name
            )
          )
        `)
        .gte('date', todayStart.toISOString())
        .lt('date', todayEnd.toISOString());

      if (todayAppointmentsError) throw new Error(`Today's appointments query error: ${todayAppointmentsError.message}`);

      console.log('Fetched appointments:', appointmentsData);

      const formattedAppointments = appointmentsData?.map((appointment) => {
        const patient = appointment.patient?.person || {};
        const clinician = appointment.clinician?.person || {};
        return {
          id: appointment.id,
          patient_id: appointment.patient_id,
          clinician_id: appointment.clinician_id,
          date: appointment.date,
          service: appointment.service,
          weight: appointment.weight,
          vitals: appointment.vitals,
          gestational_age: appointment.gestational_age,
          status: appointment.status,
          payment_status: appointment.payment_status,
          patient_name: `${patient.first_name || ""} ${patient.middle_name || ""} ${patient.last_name || ""}`.trim(),
          clinician_name: `${clinician.first_name || ""} ${clinician.middle_name || ""} ${clinician.last_name || ""}`.trim(),
        };
      }) || [];

      console.log('Formatted appointments:', formattedAppointments);
      setTodayAppointments(formattedAppointments);

    } catch (err: any) {
      console.error("Failed to fetch dashboard data:", err);
      setError(`Failed to load dashboard data: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Chart configuration for styling
  const chartConfig = {
    numberOfPatients: {
      label: "Number of Patients:",
      color: "black",
    },
  };

  // Define columns for the appointments table
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
          <ArrowUpDown className="ml-2 h-4 w-4" />
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
          <ArrowUpDown className="ml-2 h-4 w-4" />
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
          <ArrowUpDown className="ml-2 h-4 w-4" />
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
            setTodayAppointments((prev) =>
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
              setTodayAppointments((prev) =>
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
            setTodayAppointments((prev) =>
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
              await debouncedUpdateAppointmentStatus(newStatus);
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
            setTodayAppointments((prev) =>
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
              setTodayAppointments((prev) =>
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
            setTodayAppointments((prev) =>
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
              await debouncedUpdatePaymentStatus(newStatus);
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

  // Handle search and filtering
  const filteredAppointments = React.useMemo(() => {
    console.log('Filtering appointments:', { tab, searchTerm, advancedSearch });
    console.log('Current appointments:', todayAppointments);
    
    let result = [...todayAppointments];

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
  }, [todayAppointments, searchTerm, advancedSearch, tab]);

  // Initialize table
  const table = useReactTable({
    data: filteredAppointments,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { sorting, rowSelection },
  });

  const handleExport = async () => {
    console.log("Starting dashboard export process...");
    if (!chartData || !clinicianData) {
      console.error("No dashboard data available.");
      toast.error("No dashboard data available for export.");
      return;
    }

    const hasSelectedOptions = Object.values(exportOptions).some((option) => option);
    if (!hasSelectedOptions) {
      console.warn("No export options selected.");
      toast.error("Please select at least one export option.");
      return;
    }

    setIsExporting(true);
    try {
      console.log("Preparing export data...");
      const exportData = {
        exportOptions,
        exportFormat,
        activePatients,
        activeClinicians,
        totalAppointments,
        chartData,
        clinicianData,
        appointments: todayAppointments
      };

      console.log("Sending request to /api/dashboard-export...");
      const response = await fetch("/api/dashboard-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      console.log("Processing download...");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Dashboard_Report_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      a.click();
      window.URL.revokeObjectURL(url);

      console.log("Export successful.");
      toast.success("Export generated successfully.");
      setOpenExportDialog(false);
    } catch (error: any) {
      console.error("Export failed:", error);
      const errorMessage = error.message || "An unexpected error occurred during export.";
      toast.error(`Failed to generate export: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="grid flex-1 gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
      {/* Top cards (Active Patients, Active Clinicians, Total Appointments) */}
      <div className="grid w-full gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card className="@container/card">
          <CardHeader className="relative flex items-center">
            <div className="rounded border-1 p-2 mr-2">
              <Users size={20} />
            </div>
            <div>
              <CardDescription>Active Patients</CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                {loading ? "Loading..." : activePatients.toLocaleString()}
              </CardTitle>
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm">
            <div className="line-clamp-1 font-medium">
              Current number of registered patients
            </div>
            <div className="text-muted-foreground">
              Monitor patient growth trends
            </div>
          </CardFooter>
        </Card>
        <Card className="@container/card">
          <CardHeader className="relative flex items-center">
            <div className="rounded border-1 p-2 mr-2">
              <Stethoscope size={20} />
            </div>
            <div>
              <CardDescription>Active Clinicians</CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                {loading ? "Loading..." : activeClinicians.toLocaleString()}
              </CardTitle>
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm">
            <div className="line-clamp-1 font-medium">
              Current number of active healthcare providers
            </div>
            <div className="text-muted-foreground">
              Ensure adequate staffing levels
            </div>
          </CardFooter>
        </Card>
        <Card className="@container/card">
          <CardHeader className="relative flex items-center">
            <div className="rounded border-1 p-2 mr-2">
              <Calendar size={20} />
            </div>
            <div>
              <CardDescription>Total Appointments</CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                {loading ? "Loading..." : totalAppointments.toLocaleString()}
              </CardTitle>
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm">
            <div className="line-clamp-1 font-medium">
              Total scheduled and completed appointments
            </div>
            <div className="text-muted-foreground">
              Track appointment utilization
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Chart and Appointments stacked vertically */}
      <div className="w-full space-y-4">
        {/* Patient Distribution Analysis Card */}
        <Card className="@container/card rounded-lg border border-gray-200 relative z-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Patient Distribution Analysis</CardTitle>
              <CardDescription>
                {chartView === "age" ? "Distribution of patients by age" : "Top 5 clinicians by patient count"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={chartView}
                onValueChange={(value: "age" | "clinician") => setChartView(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="age">Age Distribution</SelectItem>
                  <SelectItem value="clinician">Clinician Distribution</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={openExportDialog} onOpenChange={setOpenExportDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Dashboard Data</DialogTitle>
                    <DialogDescription>
                      Select the data to include in the export and choose the format.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="selectAll"
                        checked={Object.values(exportOptions).every(Boolean)}
                        onCheckedChange={(checked) => {
                          setExportOptions({
                            overview: !!checked,
                            ageDistribution: !!checked,
                            clinicianDistribution: !!checked,
                            appointments: !!checked
                          });
                        }}
                      />
                      <Label htmlFor="selectAll" className="font-semibold">Select All</Label>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="overview"
                        checked={exportOptions.overview}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, overview: !!checked })
                        }
                      />
                      <Label htmlFor="overview">Overview (Active Patients, Clinicians, Total Appointments)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ageDistribution"
                        checked={exportOptions.ageDistribution}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, ageDistribution: !!checked })
                        }
                      />
                      <Label htmlFor="ageDistribution">Age Distribution</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clinicianDistribution"
                        checked={exportOptions.clinicianDistribution}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, clinicianDistribution: !!checked })
                        }
                      />
                      <Label htmlFor="clinicianDistribution">Clinician Distribution</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="appointments"
                        checked={exportOptions.appointments}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, appointments: !!checked })
                        }
                      />
                      <Label htmlFor="appointments">Today's Appointments</Label>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="format" className="text-right">
                        Format
                      </Label>
                      <Select value={exportFormat} onValueChange={setExportFormat}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                      </Select>
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

              {/* <Button
                size="sm"
                variant="outline"
                className="h-8 flex items-center gap-1"
                onClick={() => router.push("/Patients/Patient-Form")}
              >
                <Download />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Export
                </span>
              </Button> */}
            </div>
          </CardHeader>
          <div className="p-4 bg-white rounded-lg h-[400px]">
            {loading ? (
              <div className="text-center">Loading...</div>
            ) : error ? (
              <div className="text-red-500 text-center">{error}</div>
            ) : chartView === "age" ? (
              chartData.length === 0 ? (
                <div className="text-center">No age distribution data available</div>
              ) : (
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart
                      data={chartData}
                      margin={{ top: 0, right: 20, left: 40, bottom: 300 }}
                      barGap={2}
                      barCategoryGap={2}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="age"
                        label={{
                          value: "Age",
                          position: "insideBottom",
                          offset: -10,
                        }}
                        tickMargin={5}
                      />
                      <YAxis
                        dataKey="numberOfPatients"
                        label={{
                          value: "Number of Patients",
                          angle: -90,
                          position: "insideLeft",
                          offset: 0,
                        }}
                        domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
                        tickCount={5}
                        allowDecimals={false}
                        orientation="left"
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="numberOfPatients"
                        fill="black"
                        barSize={70}
                        radius={[4, 4, 0, 0]}
                        minPointSize={0}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )
            ) : clinicianData.length === 0 ? (
              <div className="text-center">No clinician distribution data available</div>
            ) : (
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart
                    data={clinicianData}
                    margin={{ top: 0, right: 20, left: 40, bottom: 300 }}
                    barGap={2}
                    barCategoryGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="clinicianName"
                      label={{
                        value: "Clinician",
                        position: "insideBottom",
                        offset: -10,
                      }}
                      tickMargin={5}
                    />
                    <YAxis
                      dataKey="numberOfPatients"
                      label={{
                        value: "Number of Patients",
                        angle: -90,
                        position: "insideLeft",
                        offset: 0,
                      }}
                      domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
                      tickCount={5}
                      allowDecimals={false}
                      orientation="left"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="numberOfPatients"
                      fill="black"
                      barSize={70}
                      radius={[4, 4, 0, 0]}
                      minPointSize={0}
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </div>
        </Card>

        {/* Appointments Today Card - Add z-index to ensure it's above the chart */}
        <div className="relative z-10">
          <Tabs value={tab} onValueChange={setTab} className="mt-8">
            <div className="flex items-center">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="canceled">Canceled</TabsTrigger>
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
                      <Select
                        value={advancedSearch.service || ""}
                        onValueChange={(value) =>
                          setAdvancedSearch({
                            ...advancedSearch,
                            service: value,
                          })
                        }
                      >
                        <SelectTrigger className="mb-2">
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
                        <SelectTrigger className="mb-2">
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
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex items-center gap-1"
                  onClick={() => router.push("/Dashboard/Appointments")}
                >
                  <Eye className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    View All
                  </span>
                </Button>
              </div>
            </div>

            <TabsContent value={tab}>
              <Card>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <CardTitle>Appointments Today</CardTitle>
                    <CardDescription>Appointments scheduled for today</CardDescription>
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
                          table.getRowModel().rows.map((row) => (
                            <TableRow
                              key={row.id}
                              data-state={row.getIsSelected() && "selected"}
                              className="cursor-pointer hover:bg-muted/50"
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell 
                                  key={cell.id}
                                  onClick={(e) => {
                                    // Don't navigate if clicking on a select checkbox or status/payment select
                                    if (
                                      cell.column.id === "select" ||
                                      cell.column.id === "status" ||
                                      cell.column.id === "payment_status" ||
                                      (e.target as HTMLElement).closest('select') ||
                                      (e.target as HTMLElement).closest('button')
                                    ) {
                                      e.stopPropagation();
                                      return;
                                    }
                                    router.push(`/Dashboard/Appointments/Appointment-View?id=${row.original.id}`);
                                  }}
                                >
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
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
                <CardFooter>
                  <div className="text-xs text-muted-foreground">
                    Showing <strong>1-{filteredAppointments.length}</strong> of{" "}
                    <strong>{todayAppointments.length}</strong> appointments
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AppointmentForm
        open={showAppointmentForm}
        onOpenChange={setShowAppointmentForm}
        onSuccess={() => {
          fetchDashboardData();
        }}
      />
    </main>
  );
}