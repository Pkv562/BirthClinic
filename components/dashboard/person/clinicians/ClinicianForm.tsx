"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
import { createClinician } from "@/lib/supabase/create/createClinician";
import { supabase } from "@/lib/supabase/client";

// Schema for clinician form
export const clinicianFormSchema: z.ZodType<any> = z.object({
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
    password: z.string().min(6, "Password must be at least 6 characters"),
    ecFirstName: z.string().optional(),
    ecMiddleName: z.string().optional(),
    ecLastName: z.string().optional(),
    ecContactNumber: z.string().optional(),
    ecRelationship: z.string().optional(),
    profileImage: z.any().optional(),
    profileImageUrl: z.string().optional(),
});

export type ClinicianFormValues = z.infer<typeof clinicianFormSchema>;

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

export default function ClinicianForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [filePreview, setFilePreview] = React.useState<string | null>(null);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

    // Initialize form with proper default values
    const form = useForm<ClinicianFormValues>({
        resolver: zodResolver(clinicianFormSchema),
        defaultValues: {
            firstName: "",
            middleName: "",
            lastName: "",
            age: calculateAge(new Date()),
            birthDate: new Date(),
            contactNumber: "",
            citizenship: "",
            address: "",
            religion: "",
            role: "Doctor",
            LicenseNumber: "",
            specialization: "Obstetrician",
            password: "",
            ecFirstName: "",
            ecMiddleName: "",
            ecLastName: "",
            ecContactNumber: "",
            ecRelationship: "",
            profileImage: null,
            profileImageUrl: "",
        },
    });

    // Add effect to update age when birth date changes
    React.useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'birthDate' && value.birthDate) {
                const age = calculateAge(value.birthDate);
                form.setValue('age', age);
            }
        });
        return () => subscription.unsubscribe();
    }, [form]);

    // Add effect to handle role changes
    React.useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'role' && value.role === 'Midwife') {
                form.setValue('specialization', 'Midwife');
            }
        });
        return () => subscription.unsubscribe();
    }, [form]);

    // Add this to check form state
    React.useEffect(() => {
        console.log("Form state:", form.getValues());
        console.log("Form errors:", form.formState.errors);
    }, [form.formState]);

    // Handle file selection and preview
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) {
                console.error("No file selected in handleFileChange");
                return;
            }

            setSelectedFile(file);
            form.setValue("profileImage", file);

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target?.result) {
                        setFilePreview(e.target.result as string);
                    } else {
                        console.error("FileReader failed to load file preview");
                    }
                };
                reader.onerror = (error) => {
                    console.error("FileReader error:", error);
                    toast.error("Failed to read file for preview");
                };
                reader.readAsDataURL(file);
            } else {
                console.warn("Selected file is not an image:", file.type);
                setFilePreview(null);
            }
        } catch (error) {
            console.error("Error in handleFileChange:", error);
            toast.error("Error processing selected file");
        }
    };

    const onSubmit = async (data: ClinicianFormValues) => {
        console.log("Form submission started with data:", data);
        try {
            setIsSubmitting(true);
            let profileImageUrl: string | null = null;

            // Upload profile picture to Supabase storage if a file is selected
            if (selectedFile) {
                console.log("Uploading profile picture...");
                const fileExt = selectedFile.name.split(".").pop();
                const uniquePrefix = `${data.firstName}_${data.lastName}_${Date.now()}`;
                const fileName = `${uniquePrefix}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("profile-pictures")
                    .upload(fileName, selectedFile);

                if (uploadError) {
                    console.error("File upload error:", uploadError);
                    toast.error("Failed to upload profile picture: " + uploadError.message);
                    return;
                }

                console.log("File uploaded successfully:", uploadData);

                const { data: publicUrlData } = supabase.storage
                    .from("profile-pictures")
                    .getPublicUrl(uploadData.path);

                profileImageUrl = publicUrlData.publicUrl;
                console.log("Profile picture URL generated:", profileImageUrl);
            }

            // Prepare clinician data
            const clinicianData = {
                ...data,
                profileImageUrl: profileImageUrl
            };

            console.log("Calling createClinician with data:", clinicianData);

            // Call createClinician to insert into database
            const result = await createClinician(clinicianData);
            console.log("createClinician result:", result);

            toast.success("Clinician Added Successfully", {
                description: `${data.firstName} ${data.middleName || ""} ${data.lastName} has been added.`,
            });

            // Reset form and states
            form.reset();
            setFilePreview(null);
            setSelectedFile(null);
            router.push("/Dashboard/Clinicians");
        } catch (error) {
            console.error("Error submitting form:", error);
            toast.error("Error Adding Clinician", {
                description: error instanceof Error ? error.message : "Unknown error occurred",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add a test submit handler
    const handleTestSubmit = () => {
        console.log("Submit button clicked");
        console.log("Current form values:", form.getValues());
        console.log("Form state:", form.formState);
    };

    return (
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            <FormProvider {...form}>
                <form 
                    onSubmit={form.handleSubmit((data) => {
                        console.log("Form is being submitted with data:", data);
                        onSubmit(data);
                    })} 
                    className="space-y-6"
                >
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
                                                            onError={(e) => console.error("Error loading profile image preview:", e)}
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
                                                    onClick={() => {
                                                        console.log("Profile image upload button clicked");
                                                        document.getElementById("profile-upload")?.click();
                                                    }}
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
                                                    <Input
                                                        placeholder="Enter First Name"
                                                        {...field}
                                                        aria-required="true"
                                                        onChange={(e) => {
                                                            field.onChange(e);
                                                            console.log("First name changed:", e.target.value);
                                                        }}
                                                    />
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
                                                    <Input
                                                        placeholder="Enter Middle Name"
                                                        {...field}
                                                        onChange={(e) => {
                                                            field.onChange(e);
                                                            console.log("Middle name changed:", e.target.value);
                                                        }}
                                                    />
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
                                                    <Input
                                                        placeholder="Enter Last Name"
                                                        {...field}
                                                        aria-required="true"
                                                        onChange={(e) => {
                                                            field.onChange(e);
                                                            console.log("Last name changed:", e.target.value);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="birthDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Birth Date</FormLabel>
                                                <FormControl>
                                                    <DatePicker
                                                        value={field.value}
                                                        onChange={(date) => {
                                                            field.onChange(date);
                                                            if (date) {
                                                                const age = calculateAge(date);
                                                                form.setValue('age', age);
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="age"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Age</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        disabled
                                                        value={field.value || ""}
                                                        placeholder="Age will be calculated automatically"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="contactNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Contact Number</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter Contact Number"
                                                    {...field}
                                                    aria-required="true"
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        console.log("Contact number changed:", e.target.value);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter address"
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                console.log("Address changed:", e.target.value);
                                            }}
                                        />
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
                                            <Input
                                                placeholder="Enter citizenship"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    console.log("Citizenship changed:", e.target.value);
                                                }}
                                            />
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
                                            value={field.value || "Doctor"}
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
                                            <SelectTrigger id="role">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Doctor">Doctor</SelectItem>
                                                <SelectItem value="Midwife">Midwife</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="specialization"
                                render={({ field }) => {
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
                                                <SelectTrigger id="specialization">
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
                                            <FormMessage />
                                        </FormItem>
                                    );
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="religion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Religion</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter religion"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    console.log("Religion changed:", e.target.value);
                                                }}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="LicenseNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>License Number</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter License Number"
                                                {...field}
                                                value={field.value || ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Enter password"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                                            <Input
                                                placeholder="Enter first name"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    console.log("Emergency contact first name changed:", e.target.value);
                                                }}
                                            />
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
                                            <Input
                                                placeholder="Enter middle name"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    console.log("Emergency contact middle name changed:", e.target.value);
                                                }}
                                            />
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
                                            <Input
                                                placeholder="Enter last name"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    console.log("Emergency contact last name changed:", e.target.value);
                                                }}
                                            />
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
                                            <Input
                                                placeholder="Enter contact number"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    console.log("Emergency contact number changed:", e.target.value);
                                                }}
                                            />
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
                                            <Input
                                                placeholder="Enter relationship"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    console.log("Emergency contact relationship changed:", e.target.value);
                                                }}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </fieldset>

                    <div className="justify-end gap-2ml-auto flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            type="button"
                            onClick={() => {
                                form.reset();
                                setFilePreview(null);
                                setSelectedFile(null);
                                router.push("/Dashboard/Clinicians");
                            }}
                        >
                            <CircleX />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Discard</span>
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send />
                                    Submit Form
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </FormProvider>
        </main>
    );
}