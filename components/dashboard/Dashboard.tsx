"use client";

import { Download, Search, TextSearch, ChevronDownIcon, ArrowUpDown, UserRoundPlus, Eye, MoreHorizontal, MoreVertical, Plus } from "lucide-react";
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
  Cell,
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
  DropdownMenuTrigger,
  DropdownMenuItem,
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
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker12Demo } from "@/components/dashboard/appointments/TimePicker12Demo";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Define the shape of the chart data
interface ChartData {
  age: string;
  numberOfPatients: number;
}

// Define the shape of clinician patient count data
interface ClinicianPatientCount {
  clinicianName: string;
  numberOfPatients: number;
  color: string;
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

// Add interface for schedule
interface ClinicianSchedule {
  id: number;
  clinician_id: number;
  date: string;
  start_time: string;
  end_time: string;
  clinician_name?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [clinicianData, setClinicianData] = useState<ClinicianPatientCount[]>([]);
  const [chartView, setChartView] = useState<"age" | "clinician">("age");
  const [activePatients, setActivePatients] = useState<number>(0);
  const [activeClinicians, setActiveClinicians] = useState<number>(0);
  const [todayAppointmentsCount, setTodayAppointmentsCount] = useState<number>(0);
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

  const { isAdmin } = useIsAdmin();
  const { userData } = useCurrentUser();

  // State for schedule panel
  const [clinicians, setClinicians] = useState<{ id: number; name: string }[]>([]);
  const [selectedClinician, setSelectedClinician] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<Date | undefined>(undefined);
  const [schedules, setSchedules] = useState<ClinicianSchedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClinicianSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<ClinicianSchedule | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [statusUpdatingValue, setStatusUpdatingValue] = useState<string>("");

  // Add new state for mapping clinician_id to name
  const [clinicianIdToName, setClinicianIdToName] = useState<{ [key: number]: string }>({});

  // Add fetchSchedules as a function for reuse
  const fetchSchedules = async (clinicianId = selectedClinician, dateObj = scheduleDate) => {
    console.log('Fetching schedules for:', { clinicianId, date: dateObj });
    toast.info(`Fetching schedules for clinician ${clinicianId} on ${dateObj ? dateObj.toISOString().split('T')[0] : 'N/A'}`);
    if (!clinicianId || !dateObj) {
      setSchedules([]);
      return;
    }
    setScheduleLoading(true);
    setScheduleError(null);
    const dateStr = dateObj.toISOString().split('T')[0];
    // In fetchSchedules, remove the clinician_id filter so it fetches all schedules for the selected date
    const { data, error } = await supabase
      .from('clinician_schedule')
      .select('*')
      .eq('date', dateStr);
    if (error) {
      setScheduleError('Failed to fetch schedules');
      setSchedules([]);
      toast.error('Failed to fetch schedules');
    } else {
      // Sort by start_time
      const sorted = (data || []).sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
      setSchedules(sorted);
      if (!sorted.length) {
        toast.info('No schedules found for this clinician and date.');
      }
    }
    setScheduleLoading(false);
  };

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

      // Get today's date in UTC
      const now = new Date();
      const todayStr = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().split('T')[0];

      // Fetch all schedules for today
      const { data: todaySchedules, error: todaySchedulesError } = await supabase
        .from('clinician_schedule')
        .select('clinician_id')
        .eq('date', todayStr);
      if (todaySchedulesError) throw new Error(`Today's schedules query error: ${todaySchedulesError.message}`);
      const uniqueClinicianIds = Array.from(new Set((todaySchedules || []).map(s => s.clinician_id)));
      setActiveClinicians(uniqueClinicianIds.length);

      // Fetch today's appointments count
      const { count: todayAppointmentsCount, error: todayCountError } = await supabase
        .from("appointment")
        .select("*", { count: "exact", head: true })
        .gte('date', todayStr)
        .lt('date', new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1)).toISOString());

      if (todayCountError) throw new Error(`Today's appointments count query error: ${todayCountError.message}`);
      setTodayAppointmentsCount(todayAppointmentsCount || 0);

      // Fetch today's appointments data
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
        .gte('date', todayStr)
        .lt('date', new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1)).toISOString());

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
        // --- Use age range bucketing ---
        const ages = ageData.map((row: any) => Number(row.age)).filter((a) => !isNaN(a));
        const buckets = bucketAges(ages, 10);
        setChartData(buckets.map((b) => ({ age: b.range, numberOfPatients: b.count })));
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
        // Define colors for clinicians
        const clinicianColors = [
          '#3b82f6', // Blue
          '#10b981', // Green
          '#8b5cf6', // Purple
          '#f59e0b', // Orange
          '#ec4899'  // Pink
        ];

        // Process and aggregate clinician-patient data
        const clinicianCounts = (clinicianPatientData as unknown as ClinicianWithPatients[]).map((clinician, index) => {
          // Use only first name
          const firstName = clinician.person.first_name;
          
          // Count unique patients for each clinician
          const uniquePatients = new Set(clinician.appointments?.map(p => p.patient_id) || []);
          
          return {
            clinicianName: firstName,
            numberOfPatients: uniquePatients.size,
            color: clinicianColors[index % clinicianColors.length]
          };
        });

        // Sort by number of patients and get top 5
        const top5Clinicians = clinicianCounts
          .sort((a, b) => b.numberOfPatients - a.numberOfPatients)
          .slice(0, 5);

        console.log('Clinician data with colors:', top5Clinicians);
        setClinicianData(top5Clinicians);
      }

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

  // Fetch clinicians for dropdown
  useEffect(() => {
    async function fetchClinicians() {
      const { data, error } = await supabase
        .from('clinicians')
        .select('id, role, person(id, first_name, middle_name, last_name)');
      if (error) return;
      setClinicians(
        (data || []).map((c: any) => ({
          id: c.person.id,
          name: `${c.role === 'Doctor' ? 'Dr. ' : ''}${c.person.first_name} ${c.person.middle_name || ''} ${c.person.last_name || ''}`.replace(/  +/g, ' ').trim(),
          role: c.role,
        }))
      );
      // Build the mapping with only first and last name, no Dr. prefix
      const mapping: { [key: number]: string } = {};
      (data || []).forEach((c: any) => {
        mapping[c.person.id] = `${c.person.first_name} ${c.person.last_name}`.replace(/  +/g, ' ').trim();
      });
      setClinicianIdToName(mapping);
    }
    fetchClinicians();
  }, []);

  // On mount, set default clinician and date if not set, and always fetch schedules
  useEffect(() => {
    if (!selectedClinician && clinicians.length > 0) {
      setSelectedClinician(clinicians[0].id);
    }
    if (!scheduleDate) {
      setScheduleDate(new Date());
    }
    if ((selectedClinician || clinicians.length > 0) && (scheduleDate || true)) {
      fetchSchedules(selectedClinician || clinicians[0]?.id, scheduleDate || new Date());
    }
    // eslint-disable-next-line
  }, [clinicians]);

  useEffect(() => {
    if (selectedClinician && scheduleDate) {
      fetchSchedules(selectedClinician, scheduleDate);
    }
    // eslint-disable-next-line
  }, [selectedClinician, scheduleDate]);

  // Conflict prevention helper
  function hasScheduleConflict(newStart: Date, newEnd: Date, date: string, clinicianId: number, excludeId?: number) {
    return schedules.some(s =>
      s.clinician_id === clinicianId &&
      s.date === date &&
      (excludeId === undefined || s.id !== excludeId) &&
      ((newStart < new Date(`${s.date}T${s.end_time}`) && newEnd > new Date(`${s.date}T${s.start_time}`)))
    );
  }

  // Handle schedule create/edit
  async function handleSaveSchedule(editing: boolean = false) {
    setScheduleLoading(true);
    setScheduleError(null);
    setScheduleSuccess(null);
    // Use current values or defaults
    const clinicianId = selectedClinician || (clinicians[0]?.id ?? null);
    const dateObj = scheduleDate || new Date();
    const dateStr = dateObj.toISOString().split('T')[0];
    const start = setTimeOnDate(dateObj, startTime || new Date(0, 0, 0, 8, 0, 0, 0));
    const end = setTimeOnDate(dateObj, endTime || new Date(0, 0, 0, 17, 0, 0, 0));
    const startStr = start.toTimeString().slice(0, 8);
    const endStr = end.toTimeString().slice(0, 8);
    if (!clinicianId || !dateObj || !start || !end) {
      toast.error('All fields are required');
      setScheduleLoading(false);
      return;
    }
    // Time validation
    if (end <= start) {
      toast.error('End time must be after start time.');
      setScheduleLoading(false);
      return;
    }
    // Conflict check
    if (hasScheduleConflict(start, end, dateStr, clinicianId, editingSchedule?.id)) {
      toast.error('Schedule conflict: This clinician already has a schedule that overlaps with the selected time.');
      setScheduleLoading(false);
      return;
    }
    if (editing) {
      // Update
      const { error } = await supabase.from('clinician_schedule').update({
        clinician_id: clinicianId,
        date: dateStr,
        start_time: startStr,
        end_time: endStr,
      }).eq('id', editingSchedule?.id);
      if (error) {
        toast.error('Failed to update schedule');
      } else {
        toast.success('Schedule updated');
        setEditingSchedule(null);
        setScheduleDialogOpen(false);
        fetchSchedules(selectedClinician, scheduleDate);
      }
    } else {
      // Create
      const { error } = await supabase.from('clinician_schedule').insert([
        {
          clinician_id: clinicianId,
          date: dateStr,
          start_time: startStr,
          end_time: endStr,
        },
      ]);
      if (error) {
        toast.error('Failed to save schedule');
      } else {
        toast.success('Schedule saved');
        setScheduleDialogOpen(false);
        fetchSchedules(selectedClinician, scheduleDate);
      }
    }
    setScheduleLoading(false);
  }

  async function handleDeleteSchedule(scheduleId: number) {
    setScheduleLoading(true);
    const { error } = await supabase.from('clinician_schedule').delete().eq('id', scheduleId);
    if (error) {
      toast.error('Failed to delete schedule');
    } else {
      toast.success('Schedule deleted');
      setDeletingSchedule(null);
      fetchSchedules(selectedClinician, scheduleDate);
    }
    setScheduleLoading(false);
  }

  // --- Age Range Bucketing ---
  function bucketAges(ages: number[], bucketSize = 10) {
    if (ages.length === 0) return [];
    const min = Math.min(...ages);
    const max = Math.max(...ages);
    const buckets: { range: string; count: number }[] = [];
    for (let start = Math.floor(min / bucketSize) * bucketSize; start <= max; start += bucketSize) {
      const end = start + bucketSize - 1;
      buckets.push({ range: `${start}–${end}`, count: 0 });
    }
    const firstStart = Math.floor(min / bucketSize) * bucketSize;
    ages.forEach((age) => {
      const idx = Math.floor((age - firstStart) / bucketSize);
      if (buckets[idx]) buckets[idx].count++;
    });
    return buckets.filter((b) => b.count > 0);
  }

  // Chart configuration for styling
  const chartConfig = {
    numberOfPatients: {
      label: "Number of Patients:",
      color: chartView === "age" ? "url(#blueToVioletGradient)" : "transparent",
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
        todayAppointmentsCount,
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
      {/* Top cards (Active Patients, Active Clinicians, Today's Appointments) */}
      <div className="grid w-full gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card className="@container/card border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
          <CardHeader className="relative flex items-center">
            <div className="rounded border-1 p-2 mr-2 bg-green-100">
              <Users size={20} className="text-green-600" />
            </div>
            <div>
              <CardDescription className="text-green-700">Active Patients</CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums text-green-800">
                {loading ? "Loading..." : activePatients.toLocaleString()}
              </CardTitle>
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm">
            <div className="line-clamp-1 font-medium text-green-700">
              Current number of registered patients
            </div>
            <div className="text-green-600">
              Monitor patient growth trends
            </div>
          </CardFooter>
        </Card>
        <Card className="@container/card border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
          <CardHeader className="relative flex items-center">
            <div className="rounded border-1 p-2 mr-2 bg-green-100">
              <Stethoscope size={20} className="text-green-600" />
            </div>
            <div>
              <CardDescription className="text-green-700">Active Clinicians</CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums text-green-800">
                {loading ? "Loading..." : activeClinicians.toLocaleString()}
              </CardTitle>
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm">
            <div className="line-clamp-1 font-medium text-green-700">
              Current number of active healthcare providers
            </div>
            <div className="text-green-600">
              Ensure adequate staffing levels
            </div>
          </CardFooter>
        </Card>
        <Card className="@container/card border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
          <CardHeader className="relative flex items-center">
            <div className="rounded border-1 p-2 mr-2 bg-blue-100">
              <Calendar size={20} className="text-blue-600" />
            </div>
            <div>
              <CardDescription className="text-blue-700">Today's Appointments</CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums text-blue-800">
                {loading ? "Loading..." : todayAppointmentsCount.toLocaleString()}
              </CardTitle>
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm">
            <div className="line-clamp-1 font-medium text-blue-700">
              Appointments scheduled for today
            </div>
            <div className="text-blue-600">
              Track daily appointment utilization
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Chart and Appointments stacked vertically */}
      <div className="w-full space-y-4">
        {/* Patient Distribution Analysis Card + Clinician Schedule Panel */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Chart Card - 55% width */}
          <Card className="w-full md:w-[62%] flex-shrink-0 rounded-lg border border-gray-200 relative z-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Patient Distribution Analysis</CardTitle>
                <CardDescription>
                  {chartView === "age" ? "Distribution of patients by age range" : "Top 5 clinicians by patient count"}
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
                        <Label htmlFor="overview">Overview (Active Patients, Clinicians, Today's Appointments)</Label>
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
            <div className="p-4 bg-white rounded-lg" style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '100%', maxWidth: '500px', height: '250px' }}>
                {loading ? (
                  <div className="text-center">Loading...</div>
                ) : error ? (
                  <div className="text-red-500 text-center">{error}</div>
                ) : chartView === "age" ? (
                  chartData.length === 0 ? (
                    <div className="text-center">No age distribution data available</div>
                  ) : (
                    <ChartContainer config={chartConfig}>
                      <ResponsiveContainer width={500} height={250}>
                        <BarChart
                          data={chartData}
                          margin={{ top: 20, right: 10, left: 10, bottom: 30 }}
                          barGap={0}
                          barCategoryGap={0}
                        >
                          <defs>
                            <linearGradient id="blueToVioletGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="age"
                            label={{
                              value: "Age Range",
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
                            fill="url(#blueToVioletGradient)"
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
                    <ResponsiveContainer width={500} height={250}>
                      <BarChart
                        data={clinicianData}
                        margin={{ top: 20, right: 10, left: 10, bottom: 30 }}
                        barGap={0}
                        barCategoryGap={2}
                      >
                        <defs>
                          <linearGradient id="clinicianBlueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                          </linearGradient>
                          <linearGradient id="clinicianGreenGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                          <linearGradient id="clinicianPurpleGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#7c3aed" />
                          </linearGradient>
                          <linearGradient id="clinicianOrangeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#d97706" />
                          </linearGradient>
                          <linearGradient id="clinicianPinkGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#db2777" />
                          </linearGradient>
                        </defs>
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
                          barSize={24}
                          radius={[4, 4, 0, 0]}
                          minPointSize={0}
                          maxBarSize={30}
                        >
                          {clinicianData.map((entry, index) => {
                            console.log(`Rendering cell ${index} with color:`, entry.color);
                            return <Cell key={`cell-${index}`} fill={entry.color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
            </div>
          </div>
        </Card>
        {/* Clinician Schedule Panel - 45% width */}
        <Card className="w-full md:w-[38%] flex-shrink-0 border border-gray-200">
          <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <CardHeader className="flex flex-row items-center justify-between gap-1">
              <div className="flex-1">
                <CardTitle>Clinician Schedule</CardTitle>
              </div>
              {/* Date picker for filtering schedules by date, right-aligned */}
              <div className="flex flex-row items-center gap-1">
                <DatePicker value={scheduleDate} onChange={setScheduleDate} triggerClassName="w-auto min-w-0 px-2" />
                {isAdmin && schedules.length > 0 && (
                  <DialogTrigger asChild>
                    <Button size="icon" variant="default" className="bg-black text-white hover:bg-black ml-1" onClick={() => { setEditingSchedule(null); setScheduleDialogOpen(true); }}>
                      <Plus className="w-5 h-5" />
                    </Button>
                  </DialogTrigger>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Schedules List */}
              {schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 relative">
                  {isAdmin && (
                    <DialogTrigger asChild>
                      <Button variant="default" className="bg-black text-white hover:bg-black px-6 py-2 text-base" onClick={() => { setEditingSchedule(null); setScheduleDialogOpen(true); }}>
                        Create Schedule
                      </Button>
                    </DialogTrigger>
                  )}
                  <div className="text-muted-foreground text-sm mt-4">No schedules found.</div>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 mb-2">
                  {schedules.map((s) => (
                    <li key={s.id} className="py-2 flex flex-col">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Name box: allow wrapping and flexible width */}
                        <div className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 border border-blue-200 w-auto min-w-0 max-w-xs break-words whitespace-normal">
                          {clinicianIdToName[s.clinician_id] || `Clinician #${s.clinician_id}`}
                        </div>
                        <div className="flex items-center gap-2 w-auto min-w-0">
                          {/* Time range box: allow flexible width */}
                          <div className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 border border-gray-200 w-auto min-w-0 max-w-xs break-words whitespace-normal">
                            {formatTimeSinglePill(s.start_time)}
                            <span className="mx-2 text-gray-500">-</span>
                            {formatTimeSinglePill(s.end_time)}
                          </div>
                        </div>
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 p-0"><MoreVertical /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingSchedule(s); setScheduleDialogOpen(true); }}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeletingSchedule(s)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {/* Schedule Dialog (Create/Edit) */}
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Create Clinician Schedule'}</DialogTitle>
                  <DialogDescription>Set the details for the schedule entry.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Clinician</Label>
                    <Select
                      value={selectedClinician ? String(selectedClinician) : editingSchedule ? String(editingSchedule.clinician_id) : ""}
                      onValueChange={(val) => setSelectedClinician(Number(val))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select clinician" />
                      </SelectTrigger>
                      <SelectContent>
                        {clinicians.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <DatePicker value={scheduleDate || (editingSchedule ? new Date(editingSchedule.date) : new Date())} onChange={setScheduleDate} triggerClassName="w-full" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Start Time</Label>
                      <TimePicker12Demo date={startTime || (editingSchedule ? new Date(`${editingSchedule.date}T${editingSchedule.start_time}`) : undefined)} setDate={setStartTime} />
                    </div>
                    <div className="flex-1">
                      <Label>End Time</Label>
                      <TimePicker12Demo date={endTime || (editingSchedule ? new Date(`${editingSchedule.date}T${editingSchedule.end_time}`) : undefined)} setDate={setEndTime} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={scheduleLoading} onClick={() => { setEditingSchedule(null); setScheduleDialogOpen(false); }}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button onClick={() => handleSaveSchedule(!!editingSchedule)} disabled={scheduleLoading}>
                    {scheduleLoading ? 'Saving...' : (editingSchedule ? 'Update' : 'Save')}
                  </Button>
                </DialogFooter>
              </DialogContent>
              {/* Delete Confirmation Dialog */}
              <Dialog open={!!deletingSchedule} onOpenChange={(open) => { if (!open) setDeletingSchedule(null); }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Schedule</DialogTitle>
                    <DialogDescription>Are you sure you want to delete this schedule?</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" onClick={() => setDeletingSchedule(null)}>
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button variant="destructive" onClick={() => handleDeleteSchedule(deletingSchedule?.id!)}>
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Dialog>
        </Card>
      </div>

        {/* Appointments Today Card - Add z-index to ensure it's above the chart */}
        <div className="relative z-10">
          <Tabs value={tab} onValueChange={setTab} className="mt-8">
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

function formatTime12Hour(timeStr: string) {
  if (!timeStr) return '';
  let [h, m] = timeStr.split(":");
  let hour = parseInt(h, 10);
  let minute = parseInt(m, 10);
  let ampm = hour >= 12 ? "PM" : "AM";
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;
  let suffix = (displayHour === 12 && ampm === "PM") ? "NN" : ampm;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${suffix}`;
}

// Helper for time pills: returns two pill boxes for time and period
function formatTimePills(timeStr: string) {
  if (!timeStr) return '';
  let [h, m] = timeStr.split(":");
  let hour = parseInt(h, 10);
  let minute = parseInt(m, 10);
  let ampm = hour >= 12 ? "PM" : "AM";
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;
  let suffix = (displayHour === 12 && ampm === "PM") ? "NN" : ampm;
  return <>
    <span className="inline-flex items-center rounded-lg bg-black px-2 py-0.5 text-base font-semibold text-white shadow-sm">{displayHour}:{minute.toString().padStart(2, '0')}</span>
    <span className="inline-flex items-center rounded-lg bg-yellow-400 px-2 py-0.5 text-base font-semibold text-black shadow-sm ml-1">{suffix}</span>
  </>;
}

// Helper to get first and last name from full name string
function getFirstAndLastName(fullName: string) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

// Helper for time display: plain text format
function formatTimeSinglePill(timeStr: string) {
  if (!timeStr) return '';
  let [h, m] = timeStr.split(":");
  let hour = parseInt(h, 10);
  let minute = parseInt(m, 10);
  let ampm = hour >= 12 ? "PM" : "AM";
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;
  let suffix = (displayHour === 12 && ampm === "PM") ? "NN" : ampm;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${suffix}`;
}

// Add helper function
function setTimeOnDate(date: Date, time: Date) {
  const d = new Date(date);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}