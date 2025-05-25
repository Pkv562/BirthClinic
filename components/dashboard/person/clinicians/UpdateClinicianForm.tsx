"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Camera,
    CircleX,
    Send,
    Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";

// Add this helper function at the top of the file
function calculateAge(birthDate: Date): string {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age.toString();
}

// Schema for update clinician form (same as clinicianFormSchema from ClinicianForm.tsx)
export const updateClinicianFormSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    middleName: z.string().optional(),
    lastName: z.string().min(1, "Last name is required"),
    age: z.string().min(1, "Age is required"),
    birthDate: z.date(),
    contactNumber: z.string().min(1, "Contact number is required"),
    citizenship: z.string().optional(),
    address: z.string().optional(),
    role: z.enum(["Doctor", "Midwife"], { required_error: "Role is required" }),
    LicenseNumber: z.string().min(1, "License number is required"),
    religion: z.string().optional(),
    specialization: z.enum(["Obstetrician", "Obstetrician-Gynecologist", "MFM Specialist", "Neonatologist", "Midwife"], { required_error: "Specialization is required" }),
    appointmentId: z.string().optional(),
    prescriptionId: z.string().optional(),
    ecFirstName: z.string().optional(),
    ecMiddleName: z.string().optional(),
    ecLastName: z.string().optional(),
    ecContactNumber: z.string().optional(),
    ecRelationship: z.string().optional(),
    profileImage: z.any().optional(),
    profileImageUrl: z.string().optional(),
});

export type UpdateClinicianFormValues = z.infer<typeof updateClinicianFormSchema>;

export default function UpdateClinicianForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [filePreview, setFilePreview] = React.useState<string | null>(null);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [loading, setLoading] = React.useState(true);

    // Initialize form
    const form = useForm<UpdateClinicianFormValues>({
        resolver: zodResolver(updateClinicianFormSchema),
        defaultValues: {
            firstName: "",
            middleName: "",
            lastName: "",
            age: "",
            birthDate: new Date(),
            contactNumber: "",
            citizenship: "",
            address: "",
            religion: "",
            role: "Doctor",
            LicenseNumber: "",
            specialization: "Obstetrician",
            appointmentId: "",
            prescriptionId: "",
            ecFirstName: "",
            ecMiddleName: "",
            ecLastName: "",
            ecContactNumber: "",
            ecRelationship: "",
            profileImage: null,
            profileImageUrl: "",
        },
    });

    // Add effect to handle role changes
    React.useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'role' && value.role === 'Midwife') {
                form.setValue('specialization', 'Midwife');
            }
        });
        return () => subscription.unsubscribe();
    }, [form]);

    // Add this function to get signed URL for profile image
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

    // Fetch clinician data to pre-populate the form
    React.useEffect(() => {
        async function fetchClinician() {
            if (!id) {
                toast.error("No clinician ID provided");
                router.push("/Dashboard/Clinicians");
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("clinicians")
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
                let profileImageSignedUrl = null;
                if (data.person.fileurl) {
                    profileImageSignedUrl = await getProfileImageUrl(data.person.fileurl);
                    setFilePreview(profileImageSignedUrl);
                }

                // Prepare form data
                const clinicianData = {
                    firstName: data.person.first_name,
                    middleName: data.person.middle_name || "",
                    lastName: data.person.last_name,
                    age: data.person.age || "",
                    birthDate: new Date(data.person.birth_date),
                    contactNumber: data.person.contact_number || "",
                    citizenship: data.person.citizenship || "",
                    address: data.person.address || "",
                    religion: data.person.religion || "",
                    role: data.role || "Doctor",
                    LicenseNumber: data.license_number || "",
                    specialization: data.specialization || "Obstetrician",
                    appointmentId: data.appointment_id || "",
                    prescriptionId: data.prescription_id || "",
                    ecFirstName: data.person.ec_first_name || "",
                    ecMiddleName: data.person.ec_middle_name || "",
                    ecLastName: data.person.ec_last_name || "",
                    ecContactNumber: data.person.ec_contact_number || "",
                    ecRelationship: data.person.ec_relationship || "",
                    profileImageUrl: profileImageSignedUrl || "",
                };

                form.reset(clinicianData);
                setLoading(false);
            } catch (err) {
                console.error("Unexpected error fetching clinician:", err);
                toast.error("An unexpected error occurred while fetching clinician data.");
                setLoading(false);
                return router.push("/Dashboard/Clinicians");
            }
        }

        fetchClinician();
    }, [id, form, router]);

    // Handle file selection and preview
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            form.setValue("profileImage", file);

            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setFilePreview(e.target?.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null);
            }
        }
    };

    // Handle form submission
    const onSubmit = async (data: UpdateClinicianFormValues) => {
        try {
            setIsSubmitting(true);
            console.log("Starting clinician update with data:", data);
            let profileImageUrl: string | null = data.profileImageUrl ?? null;

            // Upload new profile picture if a new file is selected
            if (selectedFile) {
                console.log("Uploading new profile picture...");
                const fileExt = selectedFile.name.split(".").pop();
                const uniquePrefix = `${data.firstName}_${data.lastName}_${Date.now()}`;
                const fileName = `${uniquePrefix}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("profile-pictures")
                    .upload(fileName, selectedFile);

                if (uploadError) {
                    console.error("File upload error:", uploadError);
                    throw new Error(`Failed to upload profile picture: ${uploadError.message}`);
                }

                console.log("Profile picture uploaded successfully:", uploadData);

                const { data: publicUrlData } = supabase.storage
                    .from("profile-pictures")
                    .getPublicUrl(uploadData.path);

                profileImageUrl = publicUrlData.publicUrl;
                console.log("New profile image URL:", profileImageUrl);
            }

            // Update person table
            console.log("Updating person table...");
            const personUpdateData = {
                first_name: data.firstName,
                middle_name: data.middleName || null,
                last_name: data.lastName,
                age: data.age,
                birth_date: data.birthDate.toISOString().split("T")[0],
                contact_number: data.contactNumber,
                citizenship: data.citizenship || null,
                address: data.address || null,
                religion: data.religion || null,
                ec_first_name: data.ecFirstName || null,
                ec_middle_name: data.ecMiddleName || null,
                ec_last_name: data.ecLastName || null,
                ec_contact_number: data.ecContactNumber || null,
                ec_relationship: data.ecRelationship || null,
                fileurl: profileImageUrl,
            };
            console.log("Person update data:", personUpdateData);

            const { error: personError } = await supabase
                .from("person")
                .update(personUpdateData)
                .eq("id", id);

            if (personError) {
                console.error("Error updating person table:", personError);
                throw new Error(`Failed to update person data: ${personError.message}`);
            }

            // Update clinicians table
            console.log("Updating clinicians table...");
            const clinicianUpdateData = {
                role: data.role,
                license_number: data.LicenseNumber,
                specialization: data.specialization,
            };
            console.log("Clinician update data:", clinicianUpdateData);

            const { error: clinicianError } = await supabase
                .from("clinicians")
                .update(clinicianUpdateData)
                .eq("id", id);

            if (clinicianError) {
                console.error("Error updating clinicians table:", clinicianError);
                throw new Error(`Failed to update clinician data: ${clinicianError.message}`);
            }

            console.log("Clinician update completed successfully");
            toast.success("Clinician Updated Successfully", {
                description: `${data.firstName} ${data.middleName || ""} ${data.lastName} has been updated`,
            });

            router.push(`/Dashboard/Clinicians/Clinician-View?id=${id}`);
        } catch (error) {
            console.error("Error updating clinician:", error);
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
            console.error("Detailed error:", error);
            toast.error("Error Updating Clinician", {
                description: errorMessage
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <fieldset className="grid gap-6 rounded-lg border p-6">
                        <legend className="-ml-1 px-1 text-sm font-medium">Basic Information</legend>
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative w-full">
                                    <FormField
                                        control={form.control}
                                        name="profileImage"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col items-center">
                                                <div className="relative w-40 h-40 rounded-full overflow-hidden border">
                                                    {filePreview ? (
                                                        <img
                                                            src={filePreview}
                                                            alt="Profile preview"
                                                            className="w-full h-full object-cover"
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
                                                <FormControl>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        id="profile-upload"
                                                        onChange={handleFileChange}
                                                    />
                                                </FormControl>
                                                <div
                                                    className="absolute right-0 bottom-2 bg-black rounded-full p-3 cursor-pointer transition-colors"
                                                    onClick={() => document.getElementById("profile-upload")?.click()}
                                                >
                                                    <Camera className="h-4 w-4 text-white" />
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 grid gap-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>First Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter First Name" {...field} aria-required="true" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="middleName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Middle Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter Middle Name" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Last Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter Last Name" {...field} aria-required="true" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="age"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Age</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter Age" {...field} aria-required="true" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="birthDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Birth Date</FormLabel>
                                                <FormControl>
                                                    <DatePicker value={field.value} onChange={field.onChange} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="contactNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Contact Number</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter Contact Number" {...field} aria-required="true" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter address" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <FormField
                                control={form.control}
                                name="citizenship"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Citizenship</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter citizenship" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="religion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Religion</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter religion" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role</FormLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                // Set appropriate specialization based on role
                                                if (value === "Midwife") {
                                                    form.setValue("specialization", "Midwife");
                                                } else if (form.getValues("specialization") === "Midwife") {
                                                    // If changing from Midwife to Doctor, set default specialization
                                                    form.setValue("specialization", "Obstetrician");
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="role" className="col-span-3">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Doctor">Doctor</SelectItem>
                                                <SelectItem value="Midwife">Midwife</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="LicenseNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>License Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter License Number" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="specialization"
                                render={({ field }: { field: any }) => {
                                    const role = form.watch("role");
                                    // Ensure specialization is set when role is Midwife
                                    React.useEffect(() => {
                                        if (role === "Midwife") {
                                            form.setValue("specialization", "Midwife");
                                        }
                                    }, [role]);

                                    return (
                                        <FormItem>
                                            <FormLabel>Specialization</FormLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                disabled={role === "Midwife"}
                                            >
                                                <SelectTrigger id="specialization" className="col-span-3">
                                                    <SelectValue placeholder="Select specialization" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {role === "Midwife" ? (
                                                        <SelectItem value="Midwife">Midwife</SelectItem>
                                                    ) : (
                                                        <>
                                                            <SelectItem value="Obstetrician">Obstetrician</SelectItem>
                                                            <SelectItem value="Obstetrician-Gynecologist">Obstetrician-Gynecologist</SelectItem>
                                                            <SelectItem value="MFM Specialist">MFM Specialist</SelectItem>
                                                            <SelectItem value="Neonatologist">Neonatologist</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    );
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            
                        </div>
                    </fieldset>

                    <fieldset className="grid gap-6 rounded-lg border p-6">
                        <legend className="-ml-1 px-1 text-sm font-medium">Emergency Contact</legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="ecFirstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter first name" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ecMiddleName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Middle Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter middle name" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ecLastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter last name" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="ecContactNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter contact number" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ecRelationship"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Relationship</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter relationship" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </fieldset>

                    <div className="justify-end ml-auto flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            onClick={() => {
                                form.reset();
                                setFilePreview(null);
                                setSelectedFile(null);
                                router.push(`/Dashboard/Clinicians/Clinician-View?id=${id}`);
                            }}
                        >
                            <CircleX />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Cancel</span>
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Send />
                                    Update Clinician
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </FormProvider>
        </main>
    );
}