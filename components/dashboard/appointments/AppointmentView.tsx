"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Calendar, Trash2, RefreshCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SupplementRecommendation from "@/components/dashboard/person/SupplementRecommendation";
import Prescriptions from "@/components/dashboard/person/Prescriptions";
import VitalsForm from "./VitalsForm";
import UpdateAppointmentForm from "./UpdateAppointmentForm";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Person {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  birth_date: string;
  age: string | null;
  contact_number: string | null;
  address: string | null;
  fileurl?: string;
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
  service: string[];
  weight: string | null;
  vitals: string | null;
  gestational_age: string | null;
  status: string;
  payment_status: string;
  patient?: Patient;
  clinician?: Clinician;
}

interface Vitals {
  id: string;
  temperature: number | null;
  pulse_rate: number | null;
  blood_pressure: string | null;
  respiration_rate: number | null;
  oxygen_saturation: number | null;
}

export default function AppointmentView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isCancelled, setIsCancelled] = useState(false);
  const { userData } = useCurrentUser();
  const [vitals, setVitals] = useState<Vitals[]>([]);
  const [hasExistingVitals, setHasExistingVitals] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    appointmentInfo: true,
    patientInfo: false,
    clinicianInfo: false,
    vitals: false,
    prescriptions: false,
    supplements: false
  });
  const [exportFormat, setExportFormat] = useState("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [profileImageSignedUrl, setProfileImageSignedUrl] = useState<string | null>(null);

  const getProfileImageUrl = async (filePath: string) => {
    try {
      const path = filePath.split('profile-pictures/')[1] || filePath;
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .createSignedUrl(path, 3600);
      if (error) {
        console.error('Error generating profile image signed URL:', error.message);
        return null;
      }
      return data.signedUrl;
    } catch (error) {
      console.error('Unexpected error generating profile image signed URL:', error);
      return null;
    }
  };

  // Add debug logs for user role
  useEffect(() => {
    console.log("Current user data:", userData);
    console.log("Is doctor?", userData?.role === "Doctor");
    console.log("Is admin?", userData?.isAdmin);
  }, [userData]);

  // Fetch appointment data from Supabase
  useEffect(() => {
    if (!id) {
      toast.error("No appointment ID provided.");
      router.push("/Dashboard/Appointments");
      return;
    }

    async function fetchAppointment() {
      try {
        const { data: appointmentData, error: appointmentError }: { data: any, error: any } = await supabase
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
                address,
                fileurl
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
          .eq('id', id)
          .single();

        if (appointmentError) {
          console.error("Error fetching appointment:", appointmentError);
          toast.error(`Failed to fetch appointment data: ${appointmentError.message}`);
          setLoading(false);
          return;
        }

        if (!appointmentData) {
          console.error("No appointment found with ID:", id);
          toast.error("Appointment not found");
          setLoading(false);
          router.push("/Dashboard/Appointments");
          return;
        }

        // Transform the data
        const transformedData = {
          ...appointmentData,
          service: Array.isArray(appointmentData.service)
            ? appointmentData.service
            : typeof appointmentData.service === 'string'
              ? (appointmentData.service as string).split(',').map((s: string) => s.trim()).filter(Boolean)
              : [],
          patient: appointmentData.patients ? {
            id: appointmentData.patients.person.id,
            person: appointmentData.patients.person
          } : undefined,
          clinician: appointmentData.clinicians ? {
            role: appointmentData.clinicians.role,
            specialization: appointmentData.clinicians.specialization,
            person: appointmentData.clinicians.person
          } : undefined
        };

        console.log("Fetched Data:", {
          appointment: appointmentData,
          transformed: transformedData
        });

        setAppointment(transformedData);
        setIsCancelled(transformedData.status.toLowerCase() === "canceled");

        // Get profile image URL if fileurl exists
        if (transformedData.patient?.person?.fileurl) {
          const signedUrl = await getProfileImageUrl(transformedData.patient.person.fileurl);
          setProfileImageSignedUrl(signedUrl);
        }

        // Fetch vitals for this appointment
        try {
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
            .eq("id", id);

          if (vitalsError) throw vitalsError;

          setVitals(vitalsData || []);
          setHasExistingVitals(vitalsData && vitalsData.length > 0);
        } catch (error: any) {
          console.error("Error fetching vitals:", error);
        }

        setLoading(false);
      } catch (err) {
        console.error("Unexpected error fetching appointment:", err);
        toast.error("An unexpected error occurred while fetching the appointment.");
        setLoading(false);
        router.push("/Dashboard/Appointments");
      }
    }

    fetchAppointment();
  }, [id, router]);

  const handleCancelToggle = async () => {
    if (!appointment) return;

    const newStatus = isCancelled ? "Scheduled" : "Canceled";
    try {
      const { error } = await supabase
        .from("appointment")
        .update({ status: newStatus })
        .eq("id", appointment.id);

      if (error) throw error;

      setIsCancelled(!isCancelled);
      setAppointment({ ...appointment, status: newStatus });
      toast.success(`Appointment status updated to ${newStatus}.`);
    } catch (err: any) {
      toast.error(`Error updating status: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("appointment")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Appointment deleted successfully.");
      setOpenDeleteDialog(false);
      router.push("/Dashboard/Appointments");
    } catch (err: any) {
      toast.error(`Error deleting appointment: ${err.message}`);
    }
  };

  const handleUpdateSuccess = async () => {
    if (!id) return;

    try {
      const { data: appointmentData, error: appointmentError }: { data: Appointment | null; error: any } = await supabase
        .from("appointment")
        .select(`
          *,
          patient:patient_id (
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
          clinician:clinician_id (
            role,
            specialization,
            person (
              first_name,
              middle_name,
              last_name
            )
          )
        `)
        .eq("id", id)
        .single();

      if (appointmentError) throw appointmentError;

      const transformedData = appointmentData ? {
        ...appointmentData,
        patient: appointmentData.patient ? {
          id: appointmentData.patient.id,
          person: appointmentData.patient.person
        } : undefined,
        clinician: appointmentData.clinician ? {
          role: appointmentData.clinician.role,
          specialization: appointmentData.clinician.specialization,
          person: appointmentData.clinician.person
        } : undefined
      } : null;

      if (transformedData) {
        setAppointment(transformedData);
        setIsCancelled(transformedData.status.toLowerCase() === "canceled");
      }
    } catch (err: any) {
      console.error("Error refreshing appointment data:", err);
      toast.error("Failed to refresh appointment data");
    }
  };

  async function handleExport() {
    console.log("Starting export process...");
    if (!appointment) {
      console.error("No appointment data available.");
      toast.error("No appointment data available for export.");
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
      console.log("Preparing export data with options:", exportOptions);

      // Fetch prescriptions if needed
      let prescriptionsData = null;
      if (exportOptions.prescriptions) {
        console.log("Fetching prescriptions for patient:", appointment.patient_id);
        const { data: prescriptions, error: prescriptionsError } = await supabase
          .from("prescriptions")
          .select("*")
          .eq("patient_id", appointment.patient_id);

        if (prescriptionsError) {
          console.error("Error fetching prescriptions:", prescriptionsError);
        } else {
          console.log("Fetched prescriptions:", prescriptions);
          prescriptionsData = prescriptions;
        }
      }

      // Fetch supplements if needed
      let supplementsData = null;
      if (exportOptions.supplements) {
        console.log("Fetching supplements for patient:", appointment.patient_id);
        const { data: supplements, error: supplementsError } = await supabase
          .from("supplements")
          .select("*")
          .eq("patient_id", appointment.patient_id);

        if (supplementsError) {
          console.error("Error fetching supplements:", supplementsError);
        } else {
          console.log("Fetched supplements:", supplements);
          supplementsData = supplements;
        }
      }

      // Include vitals data in the export
      const exportData = {
        appointment: {
          ...appointment,
          vitals: vitals[0] || null,
          prescriptions: prescriptionsData,
          supplements: supplementsData
        },
        exportOptions,
        exportFormat
      };

      console.log("Final export data being sent:", JSON.stringify(exportData, null, 2));

      console.log("Sending request to /api/export/appointment...");
      const response = await fetch("/api/export/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportData),
      });
      console.log("API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      console.log("Processing download...");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const patientName = appointment.patient
        ? `${appointment.patient.person.first_name} ${appointment.patient.person.middle_name ? appointment.patient.person.middle_name + " " : ""}${appointment.patient.person.last_name}`
        : "Unknown";
      const a = document.createElement("a");
      a.href = url;
      a.download = `Appointment_Report_${patientName}_${new Date(appointment.date).toISOString().split('T')[0]}.${exportFormat}`;
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
  }

  if (loading || !appointment) {
    return null;
  }

  const getPatientName = () => {
    const person = appointment?.patient?.person;
    if (!person) return "Unknown Patient";
    return `${person.first_name}${person.middle_name ? ` ${person.middle_name}` : ""} ${person.last_name}`;
  };

  const getClinicianName = () => {
    const person = appointment?.clinician?.person;
    if (!person) return "Unknown Clinician";
    return `${person.first_name}${person.middle_name ? ` ${person.middle_name}` : ""} ${person.last_name}`;
  };

  const fullName = getPatientName();
  const isDeleteEnabled = deleteInput.trim().toLowerCase() === fullName.trim().toLowerCase();

  return (
    <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
      <div className="grid gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <Card className="flex-1 md:flex-[2]">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative w-30 h-30 rounded-full overflow-hidden border-1">
                  {profileImageSignedUrl ? (
                    <img
                      src={profileImageSignedUrl}
                      alt={`${getPatientName()}'s profile`}
                      className="w-full h-full object-cover"
                      onError={(e) => console.error('Failed to load profile image:', profileImageSignedUrl)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <div className="w-full h-3/4 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-gray-500 rounded-full mb-1"></div>
                        <div className="w-20 h-10 bg-gray-500 rounded-t-full"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm">Patient Name</Label>
                  <CardTitle className="text-4xl font-bold">{fullName}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <Label className="font-semibold mb-2">Appointment Status</Label>
                  <p className="text-m">{appointment.status || "Not specified"}</p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Appointment Date</Label>
                  <p className="text-m">{new Date(appointment.date).toLocaleDateString() || "Not specified"}</p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Service</Label>
                  <p className="text-m">
                    {appointment.service.length <= 1
                      ? appointment.service[0] || 'Not specified'
                      : (
                        <Select defaultValue={appointment.service[0]}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue>{appointment.service[0]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {appointment.service.map((s, idx) => (
                              <SelectItem key={idx} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Payment Status</Label>
                  <p className="text-m">{appointment.payment_status || "Not specified"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 md:flex-1">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>A quick overview of actions you can take.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-2">
                    <div>
                      <Label htmlFor="cancel">Cancel Appointment</Label>
                      <p className="text-xs text-muted-foreground mt-2 mr-4">
                        Cancelling will mark the appointment as cancelled. You can reschedule later.
                      </p>
                    </div>
                    <Switch
                      id="cancel"
                      className="scale-125"
                      checked={isCancelled}
                      onCheckedChange={handleCancelToggle}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowUpdateForm(true)}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Update Appointment
                  </Button>
                  {userData?.isAdmin && (
                    <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Appointment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Appointment</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete this appointment? This action cannot be undone.
                          </DialogDescription>
                          <div className="grid gap-2 py-4">
                            <Label htmlFor="reason">Type "{fullName}" to confirm deletion</Label>
                            <Input
                              id="reason"
                              className="focus:border-red-500 focus:ring-red-500"
                              placeholder={`Enter patient name`}
                              value={deleteInput}
                              onChange={(e) => setDeleteInput(e.target.value)}
                            />
                          </div>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button
                            variant="destructive"
                            onClick={() => appointment && handleDelete(appointment.id)}
                            disabled={!isDeleteEnabled}
                            className={!isDeleteEnabled ? "opacity-50" : ""}
                          >
                            Yes, delete this appointment.
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview">
          <div className="flex items-center">
            <TabsList>
              <TabsTrigger value="overview">Appointment Overview</TabsTrigger>
              <TabsTrigger value="vitals">Vitals</TabsTrigger>
              <TabsTrigger value="supplements">Supplements</TabsTrigger>
              {(userData?.isAdmin || userData?.role === "Doctor") && (
                <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
              )}
            </TabsList>
            <div className="ml-auto flex items-center gap-2">
              <Dialog open={openExportDialog} onOpenChange={setOpenExportDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 gap-1">
                    <Download className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Appointment Data</DialogTitle>
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
                            appointmentInfo: !!checked,
                            patientInfo: !!checked,
                            clinicianInfo: !!checked,
                            vitals: !!checked,
                            prescriptions: !!checked,
                            supplements: !!checked
                          });
                        }}
                      />
                      <Label htmlFor="selectAll" className="font-semibold">Select All</Label>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="appointmentInfo"
                        checked={exportOptions.appointmentInfo}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, appointmentInfo: !!checked })
                        }
                      />
                      <Label htmlFor="appointmentInfo">Appointment Information</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="patientInfo"
                        checked={exportOptions.patientInfo}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, patientInfo: !!checked })
                        }
                      />
                      <Label htmlFor="patientInfo">Patient Information</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clinicianInfo"
                        checked={exportOptions.clinicianInfo}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, clinicianInfo: !!checked })
                        }
                      />
                      <Label htmlFor="clinicianInfo">Clinician Information</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="vitals"
                        checked={exportOptions.vitals}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, vitals: !!checked })
                        }
                      />
                      <Label htmlFor="vitals">Vitals</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="prescriptions"
                        checked={exportOptions.prescriptions}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, prescriptions: !!checked })
                        }
                      />
                      <Label htmlFor="prescriptions">Prescriptions</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="supplements"
                        checked={exportOptions.supplements}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, supplements: !!checked })
                        }
                      />
                      <Label htmlFor="supplements">Supplements</Label>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="format" className="text-right">Format</Label>
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
            </div>
          </div>

          <TabsContent value="overview">
            <Card x-chunk="dashboard-06-chunk-0">
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle>Patient Information</CardTitle>
                  <CardDescription>All gathered patient information</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Name</Label>
                    <div className="col-span-3">{getPatientName()}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Date of Birth</Label>
                    <div className="col-span-3">
                      {appointment?.patient?.person?.birth_date
                        ? new Date(appointment.patient.person.birth_date).toLocaleDateString()
                        : "Not provided"}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Age</Label>
                    <div className="col-span-3">{appointment?.patient?.person?.age || "Not provided"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Contact</Label>
                    <div className="col-span-3">{appointment?.patient?.person?.contact_number || "Not provided"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Address</Label>
                    <div className="col-span-3">{appointment?.patient?.person?.address || "Not provided"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="pt-8">
              <Card x-chunk="dashboard-06-chunk-0">
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <CardTitle>Clinician Information</CardTitle>
                    <CardDescription>Details about the assigned clinician</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Name</Label>
                      <div className="col-span-3">{getClinicianName()}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Role</Label>
                      <div className="col-span-3">{appointment?.clinician?.role || "Not specified"}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Specialization</Label>
                      <div className="col-span-3">{appointment?.clinician?.specialization || "Not specified"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vitals">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Vitals History</CardTitle>
                  <CardDescription>Record and view patient vitals for this appointment</CardDescription>
                </div>
                <Button onClick={() => setShowVitalsForm(true)}>
                  <RefreshCcw className="h-4 w-4" />
                  {hasExistingVitals ? "Update Vitals" : "Add Vitals"}
                </Button>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="space-y-6">
                  {vitals.map((vital) => (
                    <div key={vital.id}>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Weight</Label>
                          <div className="col-span-3">
                            {appointment?.weight ? `${appointment.weight} kg` : "Not recorded"}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Gestational Age</Label>
                          <div className="col-span-3">
                            {appointment?.gestational_age ? `${appointment.gestational_age} weeks` : "Not recorded"}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Temperature</Label>
                          <div className="col-span-3">
                            {vital.temperature ? `${vital.temperature} °C` : "Not recorded"}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Pulse Rate</Label>
                          <div className="col-span-3">
                            {vital.pulse_rate ? `${vital.pulse_rate} bpm` : "Not recorded"}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Blood Pressure</Label>
                          <div className="col-span-3">
                            {vital.blood_pressure || "Not recorded"}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Respiration Rate</Label>
                          <div className="col-span-3">
                            {vital.respiration_rate ? `${vital.respiration_rate} breaths/min` : "Not recorded"}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-left">Oxygen Saturation</Label>
                          <div className="col-span-3">
                            {vital.oxygen_saturation ? `${vital.oxygen_saturation}%` : "Not recorded"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {vitals.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No records yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="supplements">
            <SupplementRecommendation 
              context="patient" 
              id={appointment?.patient_id || null} 
              appointment_id={id}
            />
          </TabsContent>

          {(userData?.isAdmin || userData?.role === "Doctor") && (
            <TabsContent value="prescriptions">
              <Prescriptions 
                context="patient" 
                id={appointment?.patient_id || null} 
                appointment_id={id}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {appointment && (
        <VitalsForm
          open={showVitalsForm}
          onOpenChange={setShowVitalsForm}
          appointmentId={id!}
          existingVitals={vitals[0]}
          appointmentData={{
            weight: appointment.weight ? Number(appointment.weight) : null,
            gestational_age: appointment.gestational_age ? Number(appointment.gestational_age) : null,
          }}
          onSuccess={() => {
            const refreshData = async () => {
              try {
                const { data: appointmentData, error: appointmentError } = await supabase
                  .from("appointment")
                  .select(`
                    *,
                    patient:patient_id (
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
                    clinician:clinician_id (
                      role,
                      specialization,
                      person (
                        first_name,
                        middle_name,
                        last_name
                      )
                    )
                  `)
                  .eq("id", id)
                  .single();

                if (appointmentError) throw appointmentError;

                const transformedData = appointmentData ? {
                  ...appointmentData,
                  patient: appointmentData.patient ? {
                    id: appointmentData.patient.id,
                    person: appointmentData.patient.person
                  } : undefined,
                  clinician: appointmentData.clinician ? {
                    role: appointmentData.clinician.role,
                    specialization: appointmentData.clinician.specialization,
                    person: appointmentData.clinician.person
                  } : undefined
                } : null;

                if (transformedData) {
                  setAppointment(transformedData);
                }

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
                  .eq("id", id);

                if (vitalsError) throw vitalsError;

                setVitals(vitalsData || []);
                setHasExistingVitals(vitalsData && vitalsData.length > 0);
              } catch (error: any) {
                console.error("Error refreshing data:", error);
                toast.error("Failed to refresh data");
              }
            };

            refreshData();
          }}
        />
      )}

      {appointment && (
        <UpdateAppointmentForm
          open={showUpdateForm}
          onOpenChange={setShowUpdateForm}
          appointmentData={{
            id: appointment?.id || "",
            patient_id: appointment?.patient_id || "",
            clinician_id: appointment?.clinician_id || "",
            date: appointment?.date || new Date().toISOString(),
            service: Array.isArray(appointment?.service) ? appointment.service.join(", ") : (appointment?.service || ""),
            status: appointment?.status || "",
            payment_status: appointment?.payment_status || "",
            patient: appointment?.patient ? {
              id: appointment.patient_id,
              display: `${appointment.patient.person.first_name} ${appointment.patient.person.middle_name ? appointment.patient.person.middle_name + ' ' : ''}${appointment.patient.person.last_name}`
            } : undefined,
            clinician: appointment?.clinician ? {
              id: appointment.clinician_id,
              display: `${appointment.clinician.person.first_name} ${appointment.clinician.person.middle_name ? appointment.clinician.person.middle_name + ' ' : ''}${appointment.clinician.person.last_name}`
            } : undefined
          }}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </main>
  );
}