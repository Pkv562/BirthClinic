"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Form } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Person {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
}

interface ClinicianResponse {
  id: string;
  person: {
    first_name: string;
    middle_name: string | null;
    last_name: string;
  };
}

const appointmentFormSchema = z.object({
  patient_id: z.coerce.string().min(1, "Patient is required"),
  clinician_id: z.coerce.string().min(1, "Clinician is required"),
  date: z.coerce.date(),
  service: z.string().min(1, "Service is required"),
  status: z.string().min(1, "Status is required"),
  payment_status: z.string().min(1, "Payment status is required"),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface UpdateAppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  appointmentData: {
    id: string;
    patient_id: string;
    clinician_id: string;
    date: string;
    service: string;
    status: string;
    payment_status: string;
    patient?: {
      id: string;
      display: string;
    };
    clinician?: {
      id: string;
      display: string;
    };
  };
}

const inputClass = "h-10 w-full min-w-[140px]";

export default function UpdateAppointmentForm({ open, onOpenChange, onSuccess, appointmentData }: UpdateAppointmentFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [patients, setPatients] = React.useState<Person[]>([]);
  const [clinicians, setClinicians] = React.useState<Person[]>([]);
  const { userData } = useCurrentUser();

  const services = ["Prenatal Care", "Postpartum Care", "Consultation", "Ultrasound", "Lab Test"];
  const statuses = ["Scheduled", "Completed", "Canceled"];
  const paymentStatuses = ["Paid", "Unpaid", "Partial"];

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patient_id: appointmentData.patient_id.toString(),
      clinician_id: appointmentData.clinician_id.toString(),
      date: new Date(appointmentData.date),
      service: appointmentData.service,
      status: appointmentData.status,
      payment_status: appointmentData.payment_status,
    },
  });

  // Log form initialization
  React.useEffect(() => {
    console.log("=== Form Initialization ===");
    console.log("Initial Form Values:", form.getValues());
    console.log("Appointment Data received:", appointmentData);
  }, []);

  // Add console logs to check user data
  React.useEffect(() => {
    console.log("=== User Authentication State ===");
    console.log("Current User Data:", userData);
    console.log("Is Admin?", userData?.isAdmin);
    console.log("Clinician ID:", userData?.clinicianId);
  }, [userData]);

  React.useEffect(() => {
    const fetchData = async () => {
      console.log("=== Update Appointment Form - Starting Data Fetch ===");
      console.log("Current Form Values:", form.getValues());
      console.log("Appointment Data:", appointmentData);
      console.log("User Data:", userData);

      try {
        // Fetch patients data
        console.log("Fetching patients data...");
        const { data: patientsData, error: patientsError } = await supabase
          .from("patients")
          .select(`
            id,
            person (
              first_name,
              middle_name,
              last_name
            )
          `);

        if (patientsError) {
          console.error("Patients fetch error:", patientsError);
          toast.error("Error fetching patients");
          return;
        }

        if (patientsData) {
          console.log("Raw Patients Data:", patientsData);
          const formattedPatients = patientsData.map((p: any) => ({
            id: p.id.toString(),
            first_name: p.person.first_name || "",
            middle_name: p.person.middle_name || null,
            last_name: p.person.last_name || "",
          }));
          console.log("Formatted Patients:", formattedPatients);
          console.log("Expected Patient ID:", appointmentData.patient_id);
          setPatients(formattedPatients);

          // Compare as strings
          const patientExists = formattedPatients.some(p => p.id === appointmentData.patient_id.toString());
          console.log("Patient exists in list:", patientExists);
        }

        // Fetch clinicians data
        console.log("Starting clinician data fetch...");
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
            .eq('person.last_name', lastName)
            .single();

          if (clinicianError) {
            console.error("Clinician fetch error:", clinicianError);
            toast.error("Error fetching clinician");
            return;
          }

          if (cliniciansData) {
            const clinician: Person = {
              id: cliniciansData.id.toString(),
              first_name: cliniciansData.person.first_name || "",
              middle_name: cliniciansData.person.middle_name || null,
              last_name: cliniciansData.person.last_name || "",
            };
            console.log("Single Clinician Data:", clinician);
            setClinicians([clinician]);
          }
        } else {
          console.log("Fetching all clinicians (Admin view)");
          const { data: cliniciansData, error: cliniciansError } = await supabase
            .from("clinicians")
            .select(`
              id,
              person (
                first_name,
                middle_name,
                last_name
              )
            `);

          if (cliniciansError) {
            console.error("Clinicians fetch error:", cliniciansError);
            toast.error("Error fetching clinicians");
            return;
          }

          if (cliniciansData) {
            console.log("Raw Clinicians Data:", cliniciansData);
            const formattedClinicians = cliniciansData.map((c: any) => ({
              id: c.id.toString(),
              first_name: c.person.first_name || "",
              middle_name: c.person.middle_name || null,
              last_name: c.person.last_name || "",
            }));
            console.log("Formatted Clinicians:", formattedClinicians);
            console.log("Expected Clinician ID:", appointmentData.clinician_id);
            setClinicians(formattedClinicians);

            // Compare as strings
            const clinicianExists = formattedClinicians.some(c => c.id === appointmentData.clinician_id.toString());
            console.log("Clinician exists in list:", clinicianExists);
          }
        }

        // Log final form state after data fetch
        console.log("=== Final Form State After Data Fetch ===");
        console.log("Form Values:", form.getValues());
        console.log("Patients List:", patients);
        console.log("Clinicians List:", clinicians);

      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Failed to fetch data");
      }
    };

    if (open) {
      fetchData();
    }
  }, [open, userData]);

  // Add effect to monitor form value changes
  React.useEffect(() => {
    const subscription = form.watch((value) => {
      console.log("Form values changed:", value);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data: AppointmentFormValues) => {
    try {
      setIsSubmitting(true);

      const appointmentDate = new Date(data.date);
      appointmentDate.setHours(0, 0, 0, 0);

      // Check for existing appointments on the same date (excluding current appointment)
      const { data: existingAppointment, error: checkError } = await supabase
        .from("appointment")
        .select("id")
        .eq("patient_id", data.patient_id)
        .eq("clinician_id", data.clinician_id)
        .eq("date", appointmentDate.toISOString())
        .neq("id", appointmentData.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Check error:", checkError);
        throw new Error("Error checking for existing appointment");
      }

      if (existingAppointment) {
        throw new Error("An appointment already exists for this patient, clinician, and date.");
      }

      const updatedAppointment = {
        patient_id: data.patient_id,
        clinician_id: data.clinician_id,
        date: appointmentDate.toISOString(),
        service: data.service,
        status: data.status,
        payment_status: data.payment_status,
      };

      const { error } = await supabase
        .from("appointment")
        .update(updatedAppointment)
        .eq("id", appointmentData.id);

      if (error) throw error;

      const patient = patients.find((p) => p.id === data.patient_id);
      toast.success("Appointment updated successfully", {
        description: `Appointment for ${patient?.first_name} ${patient?.last_name} on ${appointmentDate.toLocaleDateString()}`,
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update appointment", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[725px]">
        <DialogHeader>
          <DialogTitle>Update Appointment</DialogTitle>
          <DialogDescription>
            Update the appointment details below.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patient_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.first_name} {p.middle_name ? p.middle_name + " " : ""}{p.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
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
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder="Select clinician" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clinicians.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.first_name} {c.middle_name ? c.middle_name + " " : ""}{c.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <div className={inputClass}>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentStatuses.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  "Update Appointment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 