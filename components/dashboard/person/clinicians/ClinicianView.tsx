"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Download, Mail, Trash2, RefreshCcw} from "lucide-react";
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
import { Input } from "@/components/ui/input"
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
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppointmentForm from "../../appointments/AppointmentForm";

// Define combined clinician data type
interface Clinician {
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
    appointment_id: string | null;
    role: string | null;
    license_number: string | null;
    specialization: string | null;
    prescription_id: string | null;
    ec_first_name: string | null;
    ec_middle_name: string | null;
    ec_last_name: string | null;
    ec_contact_number: string | null;
    ec_relationship: string | null;
}
export default function ClinicianView() {
    const router = useRouter();
    const [clinician, setClinician] = useState<Clinician | null>(null);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = React.useState(false);
    const [deleteInput, setDeleteInput] = useState("");
    const [isDeactivated, setIsDeactivated] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const [profileImageSignedUrl, setProfileImageSignedUrl] = useState<string | null>(null);
    const [openExportDialog, setOpenExportDialog] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportOptions, setExportOptions] = useState({
        basicInfo: true,
        supplements: false,
        prescriptions: false,
        appointments: false
    });
    const [exportFormat, setExportFormat] = useState("pdf");
    const [showAppointmentForm, setShowAppointmentForm] = useState(false);

    // Get user data from session storage
    useEffect(() => {
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            setUserData(JSON.parse(storedUser));
        }
    }, []);

    // Add getProfileImageUrl function
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

    // Define fetchClinician function at component level
    const fetchClinician = async () => {
        if (!id) return;
        
        try {
            const { data, error } = await supabase
                .from("clinicians")
                .select(`
                    *,
                    person (
                        *
                    )
                `)
                .eq("id", id)
                .single();

            if (error) {
                console.error("Supabase query error:", error);
                toast.error(`Failed to fetch clinician data: ${error.message}`);
                setLoading(false);
                return router.push("/Dashboard/Clinicians");
            }

            if (!data) {
                console.warn(`No clinician found with ID ${id}`);
                toast.error(`No clinician found with ID ${id}`);
                setLoading(false);
                return router.push("/Dashboard/Clinicians");
            }

            // Get signed URL for profile image if it exists
            if (data.person.fileurl) {
                const signedUrl = await getProfileImageUrl(data.person.fileurl);
                setProfileImageSignedUrl(signedUrl);
            }

            // Combine person and clinician data
            const combinedData: Clinician = {
                id: data.id,
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
                marital_status: data.marital_status || null,
                appointment_id: data.appointment_id || null,
                role: data.role,
                license_number: data.license_number,
                specialization: data.specialization,
                prescription_id: data.prescription_id || null,
                ec_first_name: data.person.ec_first_name,
                ec_middle_name: data.person.ec_middle_name,
                ec_last_name: data.person.ec_last_name,
                ec_contact_number: data.person.ec_contact_number,
                ec_relationship: data.person.ec_relationship
            };

            setClinician(combinedData);
            setIsDeactivated(combinedData.status === "Inactive");
        } catch (error: any) {
            console.error("Unexpected error fetching clinician:", error);
            toast.error("An unexpected error occurred while fetching clinician data.");
            setLoading(false);
            return router.push("/Dashboard/Clinicians");
        }
        setLoading(false);
    };

    // Fetch clinician data on mount
    useEffect(() => {
        fetchClinician();
    }, [id, router]);

    // Handle deactivate switch toggle
    const handleDeactivateToggle = async () => {
        if (!clinician) return;

        const newStatus = isDeactivated ? "Active" : "Inactive";
        try {
            const { error } = await supabase
                .from("person")
                .update({ status: newStatus })
                .eq("id", clinician.id);

            if (error) throw error;

            setIsDeactivated(!isDeactivated);
            setClinician({ ...clinician, status: newStatus });
            toast.success(`Clinician status updated to ${newStatus}.`);
        } catch (err: any) {
            toast.error(`Error updating clinician status: ${err.message}`);
        }
    };

    if (!clinician) {
        return null; // Just return null while loading or if no data
    }

    const handleDelete = async (id: number) => {
        try {
            // First delete all related appointments
            const { error: appointmentError } = await supabase
                .from("appointment")
                .delete()
                .eq("clinician_id", id);

            if (appointmentError) throw appointmentError;

            // Delete supplements recommendations
            const { error: supplementError } = await supabase
                .from("supplements")
                .delete()
                .eq("clinician_id", id);

            if (supplementError) throw supplementError;

            // Delete prescriptions if any
            const { error: prescriptionError } = await supabase
                .from("prescriptions")
                .delete()
                .eq("clinician_id", id);

            if (prescriptionError) throw prescriptionError;

            // Delete from clinicians table
            const { error: clinicianError } = await supabase
                .from("clinicians")
                .delete()
                .eq("id", id);

            if (clinicianError) throw clinicianError;

            // Finally delete from person table
            const { error: personError } = await supabase
                .from("person")
                .delete()
                .eq("id", id);

            if (personError) throw personError;

            toast.success("Clinician deleted successfully.");
            setOpenDialog(false);
            router.push("/Dashboard/Clinicians");
        } catch (err: any) {
            toast.error(`Error deleting clinician: ${err.message}`);
        }
    };

    const getClinicianFullName = (clinician: Clinician) => {
        return `${clinician.first_name}${clinician.middle_name ? ` ${clinician.middle_name}` : ""} ${clinician.last_name}`;
    };

    const fullName = getClinicianFullName(clinician);
    const ecFullName = clinician.ec_first_name
        ? `${clinician.ec_first_name} ${clinician.ec_middle_name ? clinician.ec_middle_name + " " : ""}${clinician.ec_last_name}`
        : "Not provided";
    const isDeleteEnabled = deleteInput.trim().toLowerCase() === fullName.trim().toLowerCase();

    async function handleExport() {
        if (!clinician || !id) {
            toast.error("No clinician data available for export.");
            return;
        }

        const hasSelectedOptions = Object.values(exportOptions).some((option) => option);
        if (!hasSelectedOptions) {
            toast.error("Please select at least one export option.");
            return;
        }

        setIsExporting(true);
        try {
            let supplements: any[] = [];
            let prescriptions: any[] = [];
            let appointments: any[] = [];

            if (exportOptions.supplements) {
                const { data: supplementsData, error: supplementsError } = await supabase
                    .from("supplements")
                    .select(`
                        *,
                        patients!patient_id (
                            person (
                                first_name,
                                middle_name,
                                last_name
                            )
                        )
                    `)
                    .eq("clinician_id", id);

                if (supplementsError) throw new Error(`Failed to fetch supplements: ${supplementsError.message}`);
                supplements = supplementsData.map((supp: any) => ({
                    ...supp,
                    patient: [
                        supp.patients?.person?.first_name,
                        supp.patients?.person?.middle_name,
                        supp.patients?.person?.last_name,
                    ]
                        .filter((part) => part)
                        .join(" ") || "Unknown Patient",
                }));
            }

            if (exportOptions.prescriptions && clinician.role === "Doctor") {
                const { data: prescriptionsData, error: prescriptionsError } = await supabase
                    .from("prescriptions")
                    .select(`
                        *,
                        patients!patient_id (
                            person (
                                first_name,
                                middle_name,
                                last_name
                            )
                        )
                    `)
                    .eq("clinician_id", id);

                if (prescriptionsError) throw new Error(`Failed to fetch prescriptions: ${prescriptionsError.message}`);
                prescriptions = prescriptionsData.map((pres: any) => ({
                    ...pres,
                    patient: [
                        pres.patients?.person?.first_name,
                        pres.patients?.person?.middle_name,
                        pres.patients?.person?.last_name,
                    ]
                        .filter((part) => part)
                        .join(" ") || "Unknown Patient",
                }));
            }

            if (exportOptions.appointments) {
                const { data: appointmentsData, error: appointmentsError } = await supabase
                    .from("appointment")
                    .select(`
                        *,
                        patients!patient_id (
                            person (
                                first_name,
                                middle_name,
                                last_name
                            )
                        )
                    `)
                    .eq("clinician_id", id);

                if (appointmentsError) throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
                appointments = appointmentsData.map((app: any) => ({
                    ...app,
                    patient: [
                        app.patients?.person?.first_name,
                        app.patients?.person?.middle_name,
                        app.patients?.person?.last_name,
                    ]
                        .filter((part) => part)
                        .join(" ") || "Unknown Patient",
                    date: new Date(app.date).toLocaleDateString()
                }));
            }

            const exportData = {
                clinician,
                exportOptions,
                exportFormat,
                supplements,
                prescriptions,
                appointments
            };

            const response = await fetch("/api/export/clinician", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(exportData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API request failed with status ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Clinician_Report_${fullName}.${exportFormat}`;
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success("Export generated successfully.");
            setOpenExportDialog(false);
        } catch (error: any) {
            const errorMessage = error.message || "An unexpected error occurred during export.";
            toast.error(`Failed to generate export: ${errorMessage}`);
        } finally {
            setIsExporting(false);
        }
    }

    return (
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="grid gap-4">
            {/* Row for Basic Information and Quick Actions */}
            <div className="flex flex-col md:flex-row gap-4">
            {/* Basic Information Card */}
            <Card className="flex-1 md:flex-[2]">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative w-30 h-30 rounded-full overflow-hidden border-1">
                            {profileImageSignedUrl ? (
                                <img
                                    src={profileImageSignedUrl}
                                    alt={`${clinician.first_name}'s profile`}
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
                            <Label className="text-sm">Clinician Name</Label>
                            <CardTitle className="text-4xl font-bold">{fullName}</CardTitle>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div>
                            <Label className="font-semibold mb-2">Clinician Status</Label>
                            <p className="text-m">{clinician.status || "Not specified"}</p>
                        </div>
                        <div>
                            <Label className="font-semibold mb-2">Role</Label>
                            <p className="text-m">{clinician.role || "Not specified"}</p>
                        </div>
                        <div>
                            <Label className="font-semibold mb-2">License Number</Label>
                            <p className="text-m">{clinician.license_number || "Not specified"}</p>
                        </div>
                        <div>
                            <Label className="font-semibold mb-2">Specialization</Label>
                            <p className="text-m">{clinician.specialization || "Not specified"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions Card */}
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
                                        Deactivating will temporarily put clinician in inactive status. You can reactivate them later.
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
                                        Archiving will remove the clinician from the active list. You can restore them later.
                                    </p>
                                </div>
                                <Switch id="archive" className="scale-125" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => setShowAppointmentForm(true)}
                            >
                                <Mail className="h-4 w-4" />
                                Set Appointment
                            </Button>
                            
                            {userData?.isAdmin && (
                                <>
                                    <Button variant="outline" onClick={() => router.push(`/Dashboard/Clinicians/Update-Clinician-Form?id=${clinician?.id}`)}>
                                        <RefreshCcw className="h-4 w-4" />
                                        Update Clinician
                                    </Button>

                                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline">
                                                <Trash2 className="h-4 w-4" />
                                                Delete Clinician
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Delete Clinician</DialogTitle>
                                                <DialogDescription>
                                                    Are you sure you want to delete this clinician? This action cannot be undone.
                                                </DialogDescription>
                                                <div className="grid gap-2 py-4">
                                                    <Label htmlFor="reason">Type "{fullName}" to confirm deletion</Label>
                                                    <Input 
                                                        id="reason" 
                                                        className="focus:border-red-500 focus:ring-red-500" 
                                                        placeholder={`Enter clinician name`} 
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
                                                    onClick={() => handleDelete(clinician.id)}
                                                    disabled={!isDeleteEnabled}
                                                    className={!isDeleteEnabled ? "opacity-50 cursor-not-allowed" : ""}
                                                >
                                                    Yes, delete this clinician
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
            </div>

            <Tabs defaultValue="overview">
            <div className="flex items-center">
                <TabsList>
                <TabsTrigger value="overview">Clinician Overview</TabsTrigger>
                <TabsTrigger value="appointments">Appointment History</TabsTrigger>
                <TabsTrigger value="supplements">Given Supplements</TabsTrigger>
                {clinician.role === "Doctor" && (
                    <TabsTrigger value="prescriptions">Given Prescriptions</TabsTrigger>
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
                            <DialogTitle>Export Clinician Data</DialogTitle>
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
                                            supplements: !!checked,
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
                                    id="supplements"
                                    checked={exportOptions.supplements}
                                    onCheckedChange={(checked) =>
                                        setExportOptions({ ...exportOptions, supplements: !!checked })
                                    }
                                />
                                <Label htmlFor="supplements">Given Supplements</Label>
                            </div>
                            {clinician.role === "Doctor" && (
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="prescriptions"
                                        checked={exportOptions.prescriptions}
                                        onCheckedChange={(checked) =>
                                            setExportOptions({ ...exportOptions, prescriptions: !!checked })
                                        }
                                    />
                                    <Label htmlFor="prescriptions">Given Prescriptions</Label>
                                </div>
                            )}
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
                    <CardTitle>Clinician Information</CardTitle>
                    <CardDescription>All gathered clinician information</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="text-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Date of Birth</Label>
                            <div className="col-span-3">{clinician.birth_date}</div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Age</Label>
                            <div className="col-span-3">{clinician.age || "Not specified"}</div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Contact</Label>
                            <div className="col-span-3">{clinician.contact_number || "Not provided"}</div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Address</Label>
                            <div className="col-span-3">{clinician.address || "Not provided"}</div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Marital Status</Label>
                            <div className="col-span-3">{clinician.marital_status || "Not provided"}</div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Citizenship</Label>
                            <div className="col-span-3">{clinician.citizenship || "Not specified"}</div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Religion</Label>
                            <div className="col-span-3">{clinician.religion || "Not specified"}</div>
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
                        <div className="col-span-3">{clinician.ec_relationship || "Not specified"}</div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Phone</Label>
                        <div className="col-span-3">{clinician.ec_contact_number || "Not provided"}</div>
                        </div>
                    </div>
                    </CardContent>
                </Card>
                </div>

            </TabsContent>

            <TabsContent value="appointments">
                <Appointments context="clinician" id={id} />
            </TabsContent>

            <TabsContent value="supplements">
                <SupplementRecommendation context='clinician' id={id} />
            </TabsContent>

            {clinician.role === "Doctor" && (
                <TabsContent value="prescriptions">
                    <Prescriptions context="clinician" id={id} />
                </TabsContent>
            )}
            </Tabs>
        </div>

        {/* Add AppointmentForm */}
        {clinician && (
            <AppointmentForm
                open={showAppointmentForm}
                onOpenChange={setShowAppointmentForm}
                onSuccess={() => {
                    setShowAppointmentForm(false);
                    fetchClinician();
                }}
                defaultClinicianId={clinician.id.toString()}
            />
        )}
        </main>
    );
}