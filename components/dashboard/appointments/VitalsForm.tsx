"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Form } from "@/components/ui/form";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Vitals {
  id: string;
  temperature: number | null;
  pulse_rate: number | null;
  blood_pressure: string | null;
  respiration_rate: number | null;
  oxygen_saturation: number | null;
}

interface AppointmentData {
  weight: number | null;
  gestational_age: number | null;
}

interface VitalsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  existingVitals?: Vitals | null;
  appointmentData?: AppointmentData | null;
  onSuccess?: () => void;
}

const vitalsFormSchema = z.object({
  temperature: z.coerce.number().min(35, "Temperature must be at least 35°C").max(42, "Temperature must be at most 42°C").nullable(),
  pulse_rate: z.coerce.number().min(40, "Pulse rate must be at least 40 bpm").max(200, "Pulse rate must be at most 200 bpm").nullable(),
  blood_pressure: z.string().min(1, "Blood pressure is required"),
  respiration_rate: z.coerce.number().min(12, "Respiration rate must be at least 12").max(30, "Respiration rate must be at most 30").nullable(),
  oxygen_saturation: z.coerce.number().min(90, "Oxygen saturation must be at least 90%").max(100, "Oxygen saturation must be at most 100%").nullable(),
  weight: z.coerce.number().min(30, "Weight must be at least 30 kg").max(200, "Weight must be at most 200 kg").nullable(),
  gestational_age: z.coerce.number().min(0, "Gestational age must be at least 0 weeks").max(45, "Gestational age must be at most 45 weeks").nullable(),
});

type VitalsFormValues = z.infer<typeof vitalsFormSchema>;

const inputClass = "h-10 w-full min-w-[140px]";

export default function VitalsForm({ open, onOpenChange, appointmentId, existingVitals, appointmentData, onSuccess }: VitalsFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<VitalsFormValues>({
    resolver: zodResolver(vitalsFormSchema),
    defaultValues: {
      temperature: existingVitals?.temperature || null,
      pulse_rate: existingVitals?.pulse_rate || null,
      blood_pressure: existingVitals?.blood_pressure || "",
      respiration_rate: existingVitals?.respiration_rate || null,
      oxygen_saturation: existingVitals?.oxygen_saturation || null,
      weight: appointmentData?.weight || null,
      gestational_age: appointmentData?.gestational_age || null,
    },
  });

  React.useEffect(() => {
    if (existingVitals || appointmentData) {
      form.reset({
        temperature: existingVitals?.temperature || null,
        pulse_rate: existingVitals?.pulse_rate || null,
        blood_pressure: existingVitals?.blood_pressure || "",
        respiration_rate: existingVitals?.respiration_rate || null,
        oxygen_saturation: existingVitals?.oxygen_saturation || null,
        weight: appointmentData?.weight || null,
        gestational_age: appointmentData?.gestational_age || null,
      });
    }
  }, [existingVitals, appointmentData, form]);

  const onSubmit = async (data: VitalsFormValues) => {
    try {
      setIsSubmitting(true);

      // Update vitals
      const vitalsData = {
        id: appointmentId,
        temperature: data.temperature,
        pulse_rate: data.pulse_rate,
        blood_pressure: data.blood_pressure,
        respiration_rate: data.respiration_rate,
        oxygen_saturation: data.oxygen_saturation,
      };

      // Update appointment data (weight and gestational age)
      const appointmentUpdate = {
        weight: data.weight,
        gestational_age: data.gestational_age,
      };

      // Start a transaction to update both tables
      const vitalsPromise = existingVitals
        ? supabase.from("vitals").update(vitalsData).eq("id", appointmentId)
        : supabase.from("vitals").insert(vitalsData);

      const appointmentPromise = supabase
        .from("appointment")
        .update(appointmentUpdate)
        .eq("id", appointmentId);

      const [vitalsResult, appointmentResult] = await Promise.all([
        vitalsPromise,
        appointmentPromise,
      ]);

      if (vitalsResult.error) throw vitalsResult.error;
      if (appointmentResult.error) throw appointmentResult.error;

      toast.success(existingVitals ? "Records updated successfully" : "Records added successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to save records");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingVitals ? "Update Records" : "Add Records"}</DialogTitle>
          <DialogDescription>
            {existingVitals ? "Update the patient's measurements and vital signs." : "Record the patient's measurements and vital signs."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter weight"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          className={inputClass}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gestational_age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gestational Age (weeks)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter gestational age"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          className={inputClass}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperature (°C)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter temperature"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pulse_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pulse Rate (bpm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter pulse rate"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="blood_pressure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Pressure</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 120/80"
                        {...field}
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="respiration_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Respiration Rate (breaths/min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter respiration rate"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        className={inputClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="oxygen_saturation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oxygen Saturation (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter oxygen saturation"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        className={inputClass}
                      />
                    </FormControl>
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
                    {existingVitals ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  existingVitals ? "Update Records" : "Add Records"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 