"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Download, Mail, Trash2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Allergy from "../Allergy";
import SupplementRecommendation from "../SupplementRecommendation";
import Prescriptions from "../Prescriptions";
import LaboratoryRecords from "../patients/LaboratoryRecords";
import Appointments from "../Appointments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
import AppointmentForm from "../../appointments/AppointmentForm";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Define combined patient data type
interface Patient {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  birth_date: string;
  age: string | null;
  contact_number: string | null;
  citizenship: string | null;
  address: string | null;
  fileurl: string | null;
  religion: string | null;
  status: string | null;
  marital_status: string | null;
  ec_first_name: string | null;
  ec_middle_name: string | null;
  ec_last_name: string | null;
  ec_contact_number: string | null;
  ec_relationship: string | null;
  expected_date_of_confinement: string | null;
  last_menstrual_cycle: string | null;
  gravidity: string | null;
  parity: string | null;
  occupation: string | null;
  ssn: string | null;
  member: string | null;
  allergy_id: number | null;
  next_appointment?: string | null;
  last_visit?: string | null;
}

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultPatientId?: string;
}

export default function PatientView() {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [profileImageSignedUrl, setProfileImageSignedUrl] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ isAdmin: boolean; isDoctor: boolean } | null>(null);
  const [exportOptions, setExportOptions] = useState({
    basicInfo: true,
    allergies: false,
    supplements: false,
    labRecords: false,
    prescriptions: false,
    appointments: false
  });
  const [exportFormat, setExportFormat] = useState("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentRefreshCounter, setAppointmentRefreshCounter] = useState(0);

  useEffect(() => {
    // Get user data from session storage
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserData({
        isAdmin: user.isAdmin,
        isDoctor: user.isDoctor
      });
    }
  }, []);

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

  useEffect(() => {
    async function fetchPatient() {
      try {
        const { data, error } = await supabase
          .from("patients")
          .select(
            `
              *,
              person (
                *
              )
            `
          )
          .eq("id", id)
          .single();

        if (error) {
          console.error("Supabase query error:", error);
          toast("Error", {
            description: `Failed to fetch patient data: ${error.message}`,
          });
          setLoading(false);
          return router.push("/Dashboard/Patients");
        }

        if (!data) {
          console.warn("No person found with ID");
          toast("Error", {
            description: "No person found with ID.",
          });
          setLoading(false);
          return router.push("/Dashboard/Patients");
        }

        const combinedData: Patient = {
          id: data.person.id,
          first_name: data.person.first_name,
          middle_name: data.person.middle_name,
          last_name: data.person.last_name,
          birth_date: data.person.birth_date,
          age: data.person.age,
          contact_number: data.person.contact_number,
          citizenship: data.person.citizenship,
          address: data.person.address,
          fileurl: data.person.fileurl,
          religion: data.person.religion,
          status: data.person.status,
          marital_status: data.marital_status,
          ec_first_name: data.person.ec_first_name,
          ec_middle_name: data.person.ec_middle_name,
          ec_last_name: data.person.ec_last_name,
          ec_contact_number: data.person.ec_contact_number,
          ec_relationship: data.person.ec_relationship,
          expected_date_of_confinement: data.expected_date_of_confinement || null,
          last_menstrual_cycle: data.last_menstrual_cycle || null,
          gravidity: data.gravidity || null,
          parity: data.parity || null,
          occupation: data.occupation || null,
          ssn: data.ssn || null,
          member: data.member || null,
          allergy_id: data.allergy_id || null,
        };

        setPatient(combinedData);
        setIsDeactivated(combinedData.status === "Inactive");

        if (combinedData.fileurl) {
          const signedUrl = await getProfileImageUrl(combinedData.fileurl);
          setProfileImageSignedUrl(signedUrl);
        }
      } catch (err) {
        console.error("Unexpected error fetching patient:", err);
        toast("Error", {
          description: "An unexpected error occurred while fetching patient data.",
        });
        setLoading(false);
        return router.push("/Patients");
      }
      setLoading(false);
    }

    fetchPatient();
  }, [router, id]);

  const handleDeactivateToggle = async () => {
    if (!patient) return;

    const newStatus = isDeactivated ? "Active" : "Inactive";
    try {
      const { error } = await supabase
        .from("person")
        .update({ status: newStatus })
        .eq("id", patient.id);

      if (error) throw error;

      setIsDeactivated(!isDeactivated);
      setPatient({ ...patient, status: newStatus });
      toast.success(`Patient status updated to ${newStatus}.`);
    } catch (err: any) {
      toast.error(`Error updating patient status: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error: patientError } = await supabase
        .from("patients")
        .delete()
        .eq("id", id);

      if (patientError) throw patientError;

      const { error: personError } = await supabase
        .from("person")
        .delete()
        .eq("id", id);

      if (personError) throw personError;

      toast.success("Patient deleted successfully.");
      setOpenDeleteDialog(false);
      router.push("/Dashboard/Patients");
    } catch (err: any) {
      toast.error(`Error deleting patient: ${err.message}`);
    }
  };

  async function handleExport() {
    console.log("Starting export process...");
    if (!patient || !id) {
      console.error("No patient data or ID available.");
      toast.error("No patient data available for export.");
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
      console.log("Fetching export data with options:", exportOptions);
      let allergies: any[] = [];
      let supplements: any[] = [];
      let labRecords: any[] = [];
      let prescriptions: any[] = [];
      let appointments: any[] = [];

      if (exportOptions.allergies) {
        console.log("Fetching allergies...");
        const { data, error } = await supabase
          .from("allergies")
          .select("*")
          .eq("patient_id", id);
        if (error) throw new Error(`Failed to fetch allergies: ${error.message}`);
        allergies = data;
        console.log("Allergies fetched:", allergies);
      }

      if (exportOptions.supplements) {
        console.log("Fetching supplements...");
        const { data, error } = await supabase
          .from("supplements")
          .select(
            `
            *,
            clinicians:clinician_id (
              role,
              specialization,
              person (
                first_name,
                middle_name,
                last_name
              )
            )
          `
          )
          .eq("patient_id", id);
        if (error) throw new Error(`Failed to fetch supplements: ${error.message}`);
        supplements = data.map((supp: any) => ({
          ...supp,
          clinician: supp.clinicians?.person ? [
            supp.clinicians.person.first_name,
            supp.clinicians.person.middle_name,
            supp.clinicians.person.last_name,
          ]
            .filter((part) => part)
            .join(" ") : "Unknown Clinician"
        }));
        console.log("Supplements fetched:", supplements);
      }

      if (exportOptions.labRecords) {
        console.log("Fetching lab records...");
        const { data, error } = await supabase
          .from("laboratory_records")
          .select("*")
          .eq("patient_id", id);
        if (error) throw new Error(`Failed to fetch lab records: ${error.message}`);
        labRecords = data;
        console.log("Lab records fetched:", labRecords);
      }

      if (exportOptions.prescriptions) {
        console.log("Fetching prescriptions...");
        const { data, error } = await supabase
          .from("prescriptions")
          .select(
            `
            *,
            clinicians:clinician_id (
              role,
              specialization,
              person (
                first_name,
                middle_name,
                last_name
              )
            )
          `
          )
          .eq("patient_id", id);
        if (error) throw new Error(`Failed to fetch prescriptions: ${error.message}`);
        prescriptions = data.map((pres: any) => ({
          ...pres,
          clinician: pres.clinicians?.person ? [
            pres.clinicians.person.first_name,
            pres.clinicians.person.middle_name,
            pres.clinicians.person.last_name,
          ]
            .filter((part) => part)
            .join(" ") : "Unknown Clinician"
        }));
        console.log("Prescriptions fetched:", prescriptions);
      }

      if (exportOptions.appointments) {
        console.log("Fetching appointments...");
        const { data, error } = await supabase
          .from("appointment")
          .select(`
            *,
            clinicians:clinician_id (
              role,
              specialization,
              person (
                first_name,
                middle_name,
                last_name
              )
            )
          `)
          .eq("patient_id", id);
        if (error) throw new Error(`Failed to fetch appointments: ${error.message}`);
        appointments = data.map((app: any) => ({
          ...app,
          clinician: app.clinicians?.person ? [
            app.clinicians.person.first_name,
            app.clinicians.person.middle_name,
            app.clinicians.person.last_name,
          ]
            .filter((part) => part)
            .join(" ") : "Unknown Clinician",
          date: new Date(app.date).toLocaleDateString()
        }));
        console.log("Appointments fetched:", appointments);
      }

      const exportData = {
        patient,
        exportOptions,
        exportFormat,
        allergies,
        supplements,
        labRecords,
        prescriptions,
        appointments
      };
      console.log("Export data prepared:", exportData);

      console.log("Sending request to /api/export...");
      const response = await fetch("/api/export", {
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
      const fullName = `${patient.first_name} ${patient.middle_name ? patient.middle_name + " " : ""}${patient.last_name}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = `Patient_Report_${fullName}.${exportFormat}`;
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

  if (!patient) {
    return null;
  }

  const fullName = `${patient.first_name} ${patient.middle_name ? patient.middle_name + " " : ""}${patient.last_name}`;
  const ecFullName = patient.ec_first_name
    ? `${patient.ec_first_name} ${patient.ec_middle_name ? patient.ec_middle_name + " " : ""}${patient.ec_last_name}`
    : "Not provided";
  const isDeleteEnabled = deleteInput.trim().toLowerCase() === fullName.trim().toLowerCase();

  return (
    <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
      <div className="grid gap-4">
        {/* Row for Basic Information and Quick Actions */}
        <div className="flex flex-col md:flex-row gap-4">
          <Card className="flex-1 md:flex-[2]">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative w-30 h-30 rounded-full overflow-hidden border-1">
                  {profileImageSignedUrl ? (
                    <img
                      src={profileImageSignedUrl}
                      alt={`${patient.first_name}'s profile`}
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
                  <Label className="font-semibold mb-2">Patient Status</Label>
                  <p className="text-m">{patient.status || "Not specified"}</p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Estimated Date of Confinement</Label>
                  <p className="text-m">{patient.expected_date_of_confinement || "Not specified"}</p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Next Appointment</Label>
                  <p className="text-m">{patient.next_appointment || "Not scheduled"}</p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Last Visit</Label>
                  <p className="text-m">{patient.last_visit || "No record"}</p>
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
                      <Label htmlFor="deactivate">Deactivate</Label>
                      <p className="text-xs text-muted-foreground mt-2 mr-4">
                        Deactivating will temporarily put patient in inactive status. You can reactivate them later.
                      </p>
                    </div>
                    <Switch
                      id="deactivate"
                      className="scale-125"
                      checked={isDeactivated}
                      onCheckedChange={handleDeactivateToggle}
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-2">
                    <div>
                      <Label htmlFor="archive">Archive</Label>
                      <p className="text-xs text-muted-foreground mt-2 mr-4">
                        Archiving will remove the patient from the active list. You can restore them later.
                      </p>
                    </div>
                    <Switch id="archive" className="scale-125" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAppointmentForm(true)}
                    >
                      <Mail className="h-4 w-4" />
                      Set Appointment
                    </Button>
                    <Button variant="outline" onClick={() => router.push(`/Dashboard/Patients/Update-Patient-Form?id=${patient.id}`)}>
                      <RefreshCcw className="h-4 w-4" />
                      Update Patient
                    </Button>
                    {userData?.isAdmin && (
                      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            <Trash2 className="h-4 w-4" />
                            Delete Patient
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Patient</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete this patient? This action cannot be undone.
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
                              <p className="text-sm text-muted-foreground">
                                {isDeleteEnabled ? 
                                  "✓ Name matches, you can delete now" : 
                                  "Enter the full name exactly as shown above to enable deletion"}
                              </p>
                            </div>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogPrimitive.Close asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogPrimitive.Close>
                            <Button
                              variant="destructive"
                              onClick={() => handleDelete(patient.id)}
                              disabled={!isDeleteEnabled}
                              className={!isDeleteEnabled ? "opacity-50 cursor-not-allowed" : ""}
                            >
                              Yes, delete this patient
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview">
          <div className="flex items-center">
            <TabsList>
              <TabsTrigger value="overview">Patient Overview</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="supplements">Supplement Recommendation</TabsTrigger>
              {(userData?.isAdmin || userData?.isDoctor) && (
                <TabsTrigger value="prescriptions">Prescription</TabsTrigger>
              )}
              <TabsTrigger value="records">Laboratory Records</TabsTrigger>
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
                    <DialogTitle>Export Patient Data</DialogTitle>
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
                            basicInfo: !!checked,
                            allergies: !!checked,
                            supplements: !!checked,
                            labRecords: !!checked,
                            prescriptions: !!checked,
                            appointments: !!checked
                          });
                        }}
                      />
                      <Label htmlFor="selectAll" className="font-semibold">Select All</Label>
                    </div>
                    <div className="h-px bg-border" /> {/* Divider */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="basicInfo"
                        checked={exportOptions.basicInfo}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, basicInfo: !!checked })
                        }
                      />
                      <Label htmlFor="basicInfo">Basic Information</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allergies"
                        checked={exportOptions.allergies}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, allergies: !!checked })
                        }
                      />
                      <Label htmlFor="allergies">Allergies</Label>
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
                        id="labRecords"
                        checked={exportOptions.labRecords}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, labRecords: !!checked })
                        }
                      />
                      <Label htmlFor="labRecords">Laboratory Records</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="appointments"
                        checked={exportOptions.appointments}
                        onCheckedChange={(checked) =>
                          setExportOptions({ ...exportOptions, appointments: !!checked })
                        }
                      />
                      <Label htmlFor="appointments">Appointments</Label>
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
                    <Label className="text-right">Date of Birth</Label>
                    <div className="col-span-3">{patient.birth_date}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Age</Label>
                    <div className="col-span-3">{patient.age || "Not specified"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Contact</Label>
                    <div className="col-span-3">{patient.contact_number || "Not provided"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Address</Label>
                    <div className="col-span-3">{patient.address || "Not provided"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Marital Status</Label>
                    <div className="col-span-3">{patient.marital_status || "Not provided"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Citizenship</Label>
                    <div className="col-span-3">{patient.citizenship || "Not specified"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Religion</Label>
                    <div className="col-span-3">{patient.religion || "Not specified"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Occupation</Label>
                    <div className="col-span-3">{patient.occupation || "Not specified"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">SSN</Label>
                    <div className="col-span-3">{patient.ssn || "Not provided"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Member Status</Label>
                    <div className="col-span-3">{patient.member || "Not specified"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="pt-8">
              <Card x-chunk="dashboard-06-chunk-0">
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <CardTitle>Emergency Contact</CardTitle>
                    <CardDescription>In case of an emergency, please contact this person.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Name</Label>
                      <div className="col-span-3">{ecFullName}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Relationship</Label>
                      <div className="col-span-3">{patient.ec_relationship || "Not specified"}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Phone</Label>
                      <div className="col-span-3">{patient.ec_contact_number || "Not provided"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="pt-8">
              <Allergy context="patient" id={id} />
            </div>
          </TabsContent>

          <TabsContent value="appointments">
            <Appointments 
              context="patient" 
              id={id} 
              refreshTrigger={appointmentRefreshCounter}
            />
          </TabsContent>

          <TabsContent value="supplements">
            <SupplementRecommendation context="patient" id={id} />
          </TabsContent>

          {(userData?.isAdmin || userData?.isDoctor) && (
            <TabsContent value="prescriptions">
              <Prescriptions context="patient" id={id} />
            </TabsContent>
          )}

          <TabsContent value="records">
            <LaboratoryRecords context="patient" id={id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add AppointmentForm */}
      {patient && (
        <AppointmentForm
          open={showAppointmentForm}
          onOpenChange={setShowAppointmentForm}
          onSuccess={() => {
            setShowAppointmentForm(false);
            setAppointmentRefreshCounter(prev => prev + 1);
            // Refresh patient data
            const fetchPatient = async () => {
              try {
                const { data, error } = await supabase
                  .from("patients")
                  .select(`
                    *,
                    person (
                      id,
                      first_name,
                      middle_name,
                      last_name,
                      birth_date,
                      age,
                      contact_number,
                      citizenship,
                      address,
                      fileurl,
                      religion,
                      status,
                      ec_first_name,
                      ec_middle_name,
                      ec_last_name,
                      ec_contact_number,
                      ec_relationship
                    )
                  `)
                  .eq("id", id)
                  .single();

                if (error) throw error;

                const combinedData: Patient = {
                  id: data.person.id,
                  first_name: data.person.first_name,
                  middle_name: data.person.middle_name,
                  last_name: data.person.last_name,
                  birth_date: data.person.birth_date,
                  age: data.person.age,
                  contact_number: data.person.contact_number,
                  citizenship: data.person.citizenship,
                  address: data.person.address,
                  fileurl: data.person.fileurl,
                  religion: data.person.religion,
                  status: data.person.status,
                  marital_status: data.marital_status,
                  ec_first_name: data.person.ec_first_name,
                  ec_middle_name: data.person.ec_middle_name,
                  ec_last_name: data.person.ec_last_name,
                  ec_contact_number: data.person.ec_contact_number,
                  ec_relationship: data.person.ec_relationship,
                  expected_date_of_confinement: data.expected_date_of_confinement || null,
                  last_menstrual_cycle: data.last_menstrual_cycle || null,
                  gravidity: data.gravidity || null,
                  parity: data.parity || null,
                  occupation: data.occupation || null,
                  ssn: data.ssn || null,
                  member: data.member || null,
                  allergy_id: data.allergy_id || null,
                };

                setPatient(combinedData);
                setIsDeactivated(combinedData.status === "Inactive");

                if (combinedData.fileurl) {
                  const signedUrl = await getProfileImageUrl(combinedData.fileurl);
                  setProfileImageSignedUrl(signedUrl);
                }
              } catch (err) {
                console.error("Unexpected error fetching patient:", err);
                toast("Error", {
                  description: "An unexpected error occurred while fetching patient data.",
                });
                setLoading(false);
                return router.push("/Patients");
              }
              setLoading(false);
            };
            fetchPatient();
          }}
          defaultPatientId={patient.id.toString()}
        />
      )}
    </main>
  );
}
