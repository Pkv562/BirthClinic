"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const appointmentFormSchema = z.object({
  patient_id: z.coerce.string().min(1, "Patient is required"),
  clinician_id: z.coerce.string().min(1, "Clinician is required"),
  date: z.string().min(1, "A valid date is required"),
  service: z.array(z.string()).min(1, "At least one service is required"),
});

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

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultPatientId?: string;
  defaultClinicianId?: string;
}

const inputClass = "h-10 w-full min-w-[140px]";

export default function AppointmentForm({ open, onOpenChange, onSuccess, defaultPatientId, defaultClinicianId }: AppointmentFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [patients, setPatients] = React.useState<Person[]>([]);
  const [clinicians, setClinicians] = React.useState<Person[]>([]);
  const { userData } = useCurrentUser();

  const services = [
    "Prenatal Care",
    "Postpartum Care",
    "Consultation",
    "Ultrasound",
    "Lab Test",
    "Family Planning",
    "Vaccination",
    "Newborn Screening",
    "Gynecology Consultation"
  ];

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patient_id: defaultPatientId || "",
      clinician_id: defaultClinicianId || "",
      date: new Date().toISOString().split("T")[0],
      service: [],
    },
  });

  // Add console logs to check user data
  React.useEffect(() => {
    console.log("=== Add Appointment Form - User Authentication State ===");
    console.log("Current User Data:", userData);
    console.log("Is Admin?", userData?.isAdmin);
    console.log("Current User Name:", userData?.name);
  }, [userData]);

  React.useEffect(() => {
    if (open) {
      form.reset({
        patient_id: defaultPatientId || "",
        clinician_id: defaultClinicianId || "",
        date: new Date().toISOString().split("T")[0],
        service: [],
      });
      const fetchData = async () => {
        try {
          // Fetch patients
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
            setPatients(
              patientsData.map((p: any) => ({
                id: p.id.toString(),
                first_name: p.person.first_name || "",
                middle_name: p.person.middle_name || null,
                last_name: p.person.last_name || "",
              }))
            );
            
            // If defaultPatientId is provided, set it as the form value
            if (defaultPatientId) {
              form.setValue("patient_id", defaultPatientId);
            }
          }

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
              .eq('person.last_name', lastName)
              .single() as { data: { id: string; person: { first_name: string; middle_name: string | null; last_name: string; } } | null; error: any };

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
              form.setValue("clinician_id", cliniciansData.id.toString());
            }
          } else {
            console.log("Fetching all clinicians (Admin view)");
            // Admin can see all clinicians
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
              const formattedClinicians = cliniciansData.map((c: any) => ({
                id: c.id.toString(),
                first_name: c.person.first_name || "",
                middle_name: c.person.middle_name || null,
                last_name: c.person.last_name || "",
              }));
              console.log("All Clinicians Data:", formattedClinicians);
              setClinicians(formattedClinicians);
            }
          }
        } catch (err) {
          console.error("Error fetching data:", err);
          toast.error("Failed to fetch data");
        }
      };
      fetchData();
    }
  }, [open, userData, form]);

  const onSubmit = async (data: AppointmentFormValues) => {
    try {
      setIsSubmitting(true);
      const appointmentDate = new Date(data.date);
      if (isNaN(appointmentDate.getTime())) {
        throw new Error("Invalid date provided");
      }
      appointmentDate.setHours(12, 0, 0, 0);
      const { data: existingAppointment, error: checkError } = await supabase
        .from("appointment")
        .select("id")
        .eq("patient_id", data.patient_id)
        .eq("clinician_id", data.clinician_id)
        .eq("date", appointmentDate.toISOString())
        .single();
      if (checkError && checkError.code !== "PGRST116") {
        throw new Error("Error checking for existing appointment");
      }
      if (existingAppointment) {
        throw new Error("An appointment already exists for this patient, clinician, and date.");
      }
      const newAppointment = {
        patient_id: data.patient_id,
        clinician_id: data.clinician_id,
        date: appointmentDate.toISOString(),
        service: data.service, // now an array
        status: "Scheduled",
        payment_status: "Unpaid",
      };
      const { error } = await supabase.from("appointment").insert([newAppointment]);
      if (error) throw error;
      const patient = patients.find((p) => p.id === data.patient_id);
      toast.success("Appointment created successfully", {
        description: `Appointment for ${patient?.first_name} ${patient?.last_name} on ${appointmentDate.toLocaleDateString()}`,
      });
      form.reset({
        patient_id: "",
        clinician_id: "",
        date: new Date().toISOString().split("T")[0],
        service: [],
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to create appointment", {
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
          <DialogTitle>Add New Appointment</DialogTitle>
          <DialogDescription>
            Create a new appointment by filling in the basic details below.
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
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!defaultPatientId}>
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
                        <DatePicker
                          value={field.value ? new Date(field.value) : undefined}
                          onChange={(date) => {
                            if (date) {
                              // Set the time to noon (12:00:00) in the local timezone
                              date.setHours(12, 0, 0, 0);
                              field.onChange(date.toISOString().split('T')[0]);
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Service checkboxes in a new row, 3 per row */}
            <div className="w-full">
              <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service</FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {services.map((s) => (
                        <label key={s} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            value={s}
                            checked={field.value.includes(s)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                field.onChange([...field.value, s]);
                              } else {
                                field.onChange(field.value.filter((v: string) => v !== s));
                              }
                            }}
                          />
                          {s}
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Appointment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}