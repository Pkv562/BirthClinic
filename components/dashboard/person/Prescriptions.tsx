"use client";

import React, { useState, useEffect } from "react";
import { PillBottle, Trash2, Search } from "lucide-react";
import { useForm, FormProvider } from "react-hook-form";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { DatePicker } from "@/components/ui/date-picker";

type Props = {
  context: "patient" | "clinician";
  id: string | null;
  fields?: any[];
  append?: (prescription: any) => void;
  remove?: (index: number) => void;
  appointment_id?: string | null;
};

const formSchema = z.object({
  name: z.string().min(1, "Prescription name is required"),
  strength: z.string().min(1, "Strength is required"),
  amount: z.string().min(1, "Amount is required"),
  frequency: z.string().min(1, "Frequency is required"),
  route: z.string().min(1, "Route is required"),
  clinician_id: z.string().min(1, "Clinician is required"),
});

type FormValues = z.infer<typeof formSchema>;

type Clinician = {
  id: string;
  full_name: string;
};

type ClinicianData = {
  id: string;
  person: {
    first_name: string;
    middle_name: string | null;
    last_name: string;
  };
};

// Add common prescription options
const COMMON_PRESCRIPTIONS = [
  { name: "Folic Acid", strength: "400mcg", amount: "1 tablet", frequency: "Once daily", route: "Oral" },
  { name: "Iron Supplement", strength: "65mg", amount: "1 tablet", frequency: "Once daily", route: "Oral" },
  { name: "Prenatal Vitamins", strength: "Multiple", amount: "1 tablet", frequency: "Once daily", route: "Oral" },
  { name: "Calcium", strength: "500mg", amount: "1 tablet", frequency: "Twice daily", route: "Oral" },
  { name: "Vitamin D", strength: "1000IU", amount: "1 tablet", frequency: "Once daily", route: "Oral" },
  { name: "Magnesium", strength: "200mg", amount: "1 tablet", frequency: "Once daily", route: "Oral" },
];

export default function Prescriptions({
  context,
  id,
  fields = [],
  append,
  remove,
  appointment_id,
}: Props) {
  const [openDialog, setOpenDialog] = useState(false);
  const [prescriptionsData, setPrescriptionsData] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [showPrescriptionDropdown, setShowPrescriptionDropdown] = useState(false);
  const { isAdmin } = useIsAdmin();
  const { userData } = useCurrentUser();

  // Add console logs to check user data
  useEffect(() => {
    console.log("=== Prescriptions Component - User Authentication State ===");
    console.log("Current User Data:", userData);
    console.log("Is Admin?", userData?.isAdmin);
    console.log("Is Doctor?", userData?.role === "Doctor");
    console.log("Clinician ID:", userData?.clinicianId);
  }, [userData]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      strength: "",
      amount: "",
      frequency: "",
      route: "",
      clinician_id: "",
    },
  });

  // Fetch clinicians
  useEffect(() => {
    async function fetchClinicians() {
      console.log("=== Prescriptions Component - Fetching Clinicians ===");
      console.log("User Role:", userData?.isAdmin ? "Admin" : "Clinician");
      console.log("User Name:", userData?.name);

      try {
        // If not admin, only show current clinician
        if (!userData?.isAdmin && userData?.name) {
          console.log("Fetching single clinician data for name:", userData.name);
          
          // Split the name into parts
          const nameParts = userData.name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts[nameParts.length - 1];
          
          const { data: cliniciansData, error: clinicianError } = await supabase
            .from("clinicians")
            .select(`
              id,
              person!inner (
                first_name,
                middle_name,
                last_name
              )
            `)
            .eq('person.first_name', firstName)
            .eq('person.last_name', lastName);

          if (clinicianError) throw clinicianError;

          if (cliniciansData && cliniciansData.length > 0) {
            const firstClinician = cliniciansData[0] as unknown as { 
              id: string; 
              person: { 
                first_name: string; 
                middle_name: string | null; 
                last_name: string; 
              } 
            };
            const clinicianList = [{
              id: firstClinician.id.toString(),
              full_name: [
                firstClinician.person.first_name,
                firstClinician.person.middle_name,
                firstClinician.person.last_name,
              ]
                .filter(Boolean)
                .join(" "),
            }];

            console.log("Single Clinician Data:", clinicianList);
            setClinicians(clinicianList);
            form.setValue("clinician_id", firstClinician.id.toString());
          }
        } else {
          console.log("Fetching all clinicians (Admin view)");
          // Admin can see all clinicians
          const { data, error } = await supabase
            .from("clinicians")
            .select(`
              id,
              person (
                first_name,
                middle_name,
                last_name
              )
            `);

          if (error) throw error;

          const clinicianList = (data as unknown as ClinicianData[]).map((clinician) => ({
            id: clinician.id.toString(),
            full_name: [
              clinician.person.first_name,
              clinician.person.middle_name,
              clinician.person.last_name,
            ]
              .filter(Boolean)
              .join(" "),
          }));

          console.log("All Clinicians Data:", clinicianList);
          setClinicians(clinicianList);
        }
      } catch (err) {
        console.error("Error fetching clinicians:", err);
        toast.error("Failed to fetch clinicians");
      }
    }

    fetchClinicians();
  }, [userData, form]);

  // Fetch prescriptions
  useEffect(() => {
    async function fetchPrescriptions() {
      if (!id) {
        setPrescriptionsData(fields);
        setFetchError(null);
        return;
      }

      try {
        const query = supabase
          .from("prescriptions")
          .select(`
            id,
            clinician_id,
            patient_id,
            appointment_id,
            name,
            strength,
            amount,
            frequency,
            route,
            status,
            date,
            clinicians!clinician_id (
              id,
              person (
                first_name,
                middle_name,
                last_name
              )
            ),
            patients!patient_id (
              id,
              person (
                first_name,
                middle_name,
                last_name
              )
            )
          `);

        // Apply filter based on context
        if (context === 'patient') {
          query.eq("patient_id", id);
        } else {
          query.eq("clinician_id", id);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Prescription fetch error:", error.code, error.message, error.details);
          setFetchError(`Failed to fetch prescriptions: ${error.message}`);
          toast("Error", {
            description: `Failed to fetch prescriptions: ${error.message}`,
          });
          setPrescriptionsData([]);
        } else {
          const formattedData = data.map((prescription: any) => {
            const clinicianName = prescription.clinicians?.person
              ? [
                  prescription.clinicians.person.first_name,
                  prescription.clinicians.person.middle_name,
                  prescription.clinicians.person.last_name,
                ]
                  .filter((part) => part != null && part !== "")
                  .join(" ") || "Unknown Clinician"
              : "Unknown Clinician";

            const patientName = prescription.patients?.person
              ? [
                  prescription.patients.person.first_name,
                  prescription.patients.person.middle_name,
                  prescription.patients.person.last_name,
                ]
                  .filter((part) => part != null && part !== "")
                  .join(" ") || "Unknown Patient"
              : "Unknown Patient";

            if (!prescription.clinicians?.person?.first_name) {
              console.warn(`Missing clinician name for prescription ID ${prescription.id}:`, prescription.clinicians);
            }

            return {
              id: prescription.id,
              name: prescription.name || "N/A",
              strength: prescription.strength || "N/A",
              amount: prescription.amount || "N/A",
              frequency: prescription.frequency || "N/A",
              route: prescription.route || "N/A",
              clinician_id: prescription.clinician_id?.toString(),
              clinician: clinicianName,
              patient: patientName,
              appointment_id: prescription.appointment_id,
              status: prescription.status || "Active",
              date: prescription.date ? new Date(prescription.date).toLocaleDateString() : "N/A",
            };
          });
          setPrescriptionsData(formattedData);
          setFetchError(null);
          if (append) {
            formattedData.forEach((prescription: any) => {
              append({
                ...prescription
              });
            });
          }
        }
      } catch (err) {
        console.error("Unexpected error fetching prescriptions:", err);
        setFetchError("Unexpected error fetching prescriptions.");
        toast("Error", {
          description: "Unexpected error fetching prescriptions.",
        });
        setPrescriptionsData([]);
      }
    }

    fetchPrescriptions();
  }, [id, fields, append, context]);

  const onSubmitPrescription = async (data: FormValues) => {
    if (!id && !append) {
      toast("Error", {
        description: "Cannot add prescription without form integration.",
      });
      return;
    }

    try {
      if (id) {
        const prescriptionData = {
          patient_id: id,
          clinician_id: parseInt(data.clinician_id),
          appointment_id: appointment_id,
          name: data.name,
          strength: data.strength,
          amount: data.amount,
          frequency: data.frequency,
          route: data.route,
          status: "Active",
          date: new Date().toISOString(),
        };

        const { data: newPrescription, error } = await supabase
          .from("prescriptions")
          .insert([prescriptionData])
          .select()
          .single();

        if (error) {
          console.error("Error adding prescription:", error);
          toast.error(`Failed to add prescription: ${error.message}`);
          return;
        }

        const clinicianName = clinicians.find((c) => c.id === data.clinician_id)?.full_name || "Unknown Clinician";
        if (clinicianName === "Unknown Clinician") {
          console.warn(`No clinician found for clinician_id ${data.clinician_id} during prescription insert`);
        }

        const formattedDate = new Date(newPrescription.date).toLocaleDateString();
        if (append) {
          append({
            id: newPrescription.id,
            name: data.name,
            strength: data.strength,
            amount: data.amount,
            frequency: data.frequency,
            route: data.route,
            clinician_id: data.clinician_id,
            clinician: clinicianName,
            appointment_id: appointment_id,
            status: newPrescription.status,
            date: formattedDate,
          });
        } else {
          setPrescriptionsData((prev) => [
            ...prev,
            {
              id: newPrescription.id,
              name: data.name,
              strength: data.strength,
              amount: data.amount,
              frequency: data.frequency,
              route: data.route,
              clinician_id: data.clinician_id,
              clinician: clinicianName,
              appointment_id: appointment_id,
              status: newPrescription.status,
              date: formattedDate,
            },
          ]);
        }
        toast.success("Prescription Added", {
          description: "New prescription has been added successfully.",
        });
      } else if (append) {
        const clinicianName = clinicians.find((c) => c.id === data.clinician_id)?.full_name || "Unknown Clinician";
        if (clinicianName === "Unknown Clinician") {
          console.warn(`No clinician found for clinician_id ${data.clinician_id} during prescription append`);
        }

        const formattedDate = new Date().toLocaleDateString();
        append({
          name: data.name,
          strength: data.strength,
          amount: data.amount,
          frequency: data.frequency,
          route: data.route,
          clinician_id: data.clinician_id,
          clinician: clinicianName,
          appointment_id: appointment_id,
          status: "Active",
          date: formattedDate,
        });
        toast.success("Prescription Added", {
          description: "New prescription has been added successfully.",
        });
      }

      form.reset({
        name: "",
        strength: "",
        amount: "",
        frequency: "",
        route: "",
        clinician_id: "",
      });
      setOpenDialog(false);
    } catch (err: any) {
      console.error("Error saving prescription:", err);
      toast.error(`Failed to save prescription: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (index: number) => {
    try {
      if (id) {
        const prescriptionToDelete = (fields.length > 0 ? fields : prescriptionsData)[index];
        const { error: prescriptionError } = await supabase
          .from("prescriptions")
          .delete()
          .eq("id", prescriptionToDelete.id);

        if (prescriptionError) {
          console.error("Prescription delete error:", prescriptionError.code, prescriptionError.message, prescriptionError.details);
          toast("Error", {
            description: `Failed to delete prescription: ${prescriptionError.message}`,
          });
          return;
        }

        setPrescriptionsData((prev) => prev.filter((_, idx) => idx !== index));
      }

      if (remove) {
        remove(index);
      }
      toast("Prescription Deleted", {
        description: "Prescription has been removed from the list.",
      });
    } catch (err) {
      console.error("Unexpected error deleting prescription:", err);
      toast("Error", {
        description: "An unexpected error occurred while deleting the prescription.",
      });
    }
  };

  const handleStatusChange = async (index: number, newStatus: string) => {
    try {
      const prescriptionToUpdate = (fields.length > 0 ? fields : prescriptionsData)[index];
      if (id) {
        const { error } = await supabase
          .from("prescriptions")
          .update({ status: newStatus })
          .eq("id", prescriptionToUpdate.id);

        if (error) {
          console.error("Prescription status update error:", error.code, error.message, error.details);
          toast("Error", {
            description: `Failed to update prescription status: ${error.message}`,
          });
          return;
        }
      }

      setPrescriptionsData((prev) =>
        prev.map((prescription, idx) =>
          idx === index ? { ...prescription, status: newStatus } : prescription
        )
      );

      if (fields.length > 0 && append) {
        append({
          ...prescriptionToUpdate,
          status: newStatus,
        });
      }

      toast.success("Status Updated", {
        description: `Prescription status changed to ${newStatus}.`,
      });
    } catch (err) {
      console.error("Unexpected error updating status:", err);
      toast("Error", {
        description: "An unexpected React.createElement updating the status.",
      });
    }
  };

  const displayPrescriptions = React.useMemo(() => {
    const data = fields.length > 0 ? fields : prescriptionsData;
    if (!searchTerm && statusFilter === "all" && !dateFilter) return data;

    return data.filter((prescription) => {
      const searchString = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        prescription.name?.toLowerCase().includes(searchString) ||
        (context === 'patient' 
          ? prescription.clinician?.toLowerCase().includes(searchString)
          : prescription.patient?.toLowerCase().includes(searchString))
      );

      const matchesStatus = statusFilter === "all" || prescription.status.toLowerCase() === statusFilter.toLowerCase();
      
      const matchesDate = !dateFilter || 
        (prescription.date && new Date(prescription.date).toLocaleDateString() === new Date(dateFilter).toLocaleDateString());

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [fields, prescriptionsData, searchTerm, statusFilter, dateFilter]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle>Prescriptions</CardTitle>
          <CardDescription>
            {context === 'patient' 
              ? "Identify your patient's prescriptions before it's too late"
              : "View all prescriptions you have given to patients"}
          </CardDescription>
        </div>
        <div className="relative flex items-center">
          {context === 'patient' && (userData?.isAdmin || userData?.role === "Doctor") && (
            <Dialog
              open={openDialog}
              onOpenChange={(open) => {
                setOpenDialog(open);
                if (!open) {
                  form.reset({
                    name: "",
                    strength: "",
                    amount: "",
                    frequency: "",
                    route: "",
                    clinician_id: "",
                  });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 flex items-center gap-1">
                  <PillBottle className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add Prescription
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[1000px]">
                <DialogHeader>
                  <DialogTitle>Add Prescription</DialogTitle>
                  <DialogDescription>
                    Add a new prescription to your patient. Click save when you're done!
                  </DialogDescription>
                </DialogHeader>
                <FormProvider {...form}>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmitPrescription)}
                      className="grid gap-4 py-4"
                    >
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Prescription</FormLabel>
                              <div className="relative">
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Type or select prescription..."
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      // Clear other fields when typing custom
                                      form.setValue("strength", "");
                                      form.setValue("amount", "");
                                      form.setValue("frequency", "");
                                      form.setValue("route", "");
                                    }}
                                    onFocus={() => setShowPrescriptionDropdown(true)}
                                    onBlur={(e) => {
                                      // Check if the related target is in the dropdown
                                      const dropdown = e.currentTarget.parentElement?.querySelector('.prescription-dropdown');
                                      if (!dropdown?.contains(e.relatedTarget)) {
                                        setShowPrescriptionDropdown(false);
                                      }
                                    }}
                                  />
                                </FormControl>
                                {showPrescriptionDropdown && (
                                  <div 
                                    className="prescription-dropdown absolute w-full z-10 top-[100%] max-h-[200px] overflow-auto rounded-md border bg-popover p-0 text-popover-foreground shadow-md"
                                    onMouseDown={(e) => {
                                      // Prevent blur from hiding dropdown when clicking options
                                      e.preventDefault();
                                    }}
                                  >
                                    {COMMON_PRESCRIPTIONS.map((prescription) => (
                                      <div
                                        key={prescription.name}
                                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                        onMouseDown={() => {
                                          form.setValue("name", prescription.name);
                                          form.setValue("strength", prescription.strength);
                                          form.setValue("amount", prescription.amount);
                                          form.setValue("frequency", prescription.frequency);
                                          form.setValue("route", prescription.route);
                                          setShowPrescriptionDropdown(false);
                                        }}
                                      >
                                        {prescription.name}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="strength"
                          render={({ field }) => (
                            <FormItem className="grid grid-cols-4 items-center gap-2">
                              <FormLabel htmlFor="strength" className="text-right">
                                Strength
                              </FormLabel>
                              <FormControl>
                                <Input
                                  id="strength"
                                  placeholder="Enter strength"
                                  className="col-span-4"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="col-span-4" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem className="grid grid-cols-4 items-center gap-2">
                              <FormLabel htmlFor="amount" className="text-right">
                                Amount
                              </FormLabel>
                              <FormControl>
                                <Input
                                  id="amount"
                                  placeholder="Enter amount"
                                  className="col-span-4"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="col-span-4" />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="frequency"
                          render={({ field }) => (
                            <FormItem className="grid grid-cols-4 items-center gap-2">
                              <FormLabel htmlFor="frequency" className="text-right">
                                Frequency
                              </FormLabel>
                              <FormControl>
                                <Input
                                  id="frequency"
                                  placeholder="Enter frequency"
                                  className="col-span-4"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="col-span-4" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="route"
                          render={({ field }) => (
                            <FormItem className="grid grid-cols-4 items-center gap-2">
                              <FormLabel htmlFor="route" className="text-right">
                                Route
                              </FormLabel>
                              <FormControl>
                                <Input
                                  id="route"
                                  placeholder="Enter route"
                                  className="col-span-4"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="col-span-4" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="clinician_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Clinician</FormLabel>
                              <Select 
                                value={field.value} 
                                onValueChange={field.onChange}
                                disabled={!userData?.isAdmin}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select clinician" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {clinicians.map((clinician) => (
                                    <SelectItem key={clinician.id} value={clinician.id}>
                                      {clinician.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit">Save prescription</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </FormProvider>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[180px] max-w-[790px]">
              <Input
                type="search"
                placeholder="Search by prescription name or patient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-none w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active" className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    Active
                  </SelectItem>
                  <SelectItem value="Completed" className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    Completed
                  </SelectItem>
                  <SelectItem value="Discontinued" className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    Discontinued
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-none w-[200px]">
              <DatePicker
                value={dateFilter ? new Date(dateFilter) : undefined}
                onChange={(date) => setDateFilter(date ? date.toISOString() : "")}
              />
            </div>
          </div>
        </div>
        {fetchError ? (
          <p className="text-sm text-red-600">{fetchError}</p>
        ) : displayPrescriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {searchTerm || statusFilter !== "all" || dateFilter
              ? "No prescriptions found matching the search criteria."
              : context === 'patient'
                ? "No prescriptions recorded for this patient."
                : "No prescriptions given by this clinician."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>
                  <Checkbox id="select-all" />
                </TableCell>
                <TableHead>Prescription</TableHead>
                <TableHead>Strength</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                {context === 'patient' ? (
                  <TableHead>Clinician</TableHead>
                ) : (
                  <TableHead>Patient</TableHead>
                )}
                <TableHead>Issued on</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayPrescriptions.map((prescription, index) => (
                <TableRow key={prescription.id || index}>
                  <TableCell>
                    <Checkbox id={`prescription-${prescription.id || index}`} />
                  </TableCell>
                  <TableCell className="font-medium">{prescription.name}</TableCell>
                  <TableCell>{prescription.strength}</TableCell>
                  <TableCell>{prescription.amount}</TableCell>
                  <TableCell>{prescription.frequency}</TableCell>
                  <TableCell>{prescription.route}</TableCell>
                  <TableCell>
                    <Select
                      value={prescription.status}
                      onValueChange={(value) => handleStatusChange(index, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active" className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                          Active
                        </SelectItem>
                        <SelectItem value="Completed" className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                          Completed
                        </SelectItem>
                        <SelectItem value="Discontinued" className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-400" />
                          Discontinued
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {context === 'patient' ? prescription.clinician : prescription.patient}
                  </TableCell>
                  <TableCell>{prescription.date}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{displayPrescriptions.length}</strong> of{" "}
          <strong>{fields.length > 0 ? fields.length : prescriptionsData.length}</strong>
        </div>
      </CardFooter>
    </Card>
  );
}