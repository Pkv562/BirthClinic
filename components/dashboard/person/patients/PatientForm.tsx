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
import { createPatient } from "@/lib/supabase/create/createPatient";
import { supabase } from "@/lib/supabase/client";

// Schema for patient form
export const patientFormSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    middleName: z.string().optional(),
    lastName: z.string().min(1, "Last name is required"),
    age: z.string().min(1, "Age is required"),
    birthDate: z.date(),
    contactNumber: z.string().min(1, "Contact number is required"),
    citizenship: z.string().optional(),
    address: z.string().optional(),
    maritalStatus: z.string().optional(),
    occupation: z.string().optional(),
    religion: z.string().optional(),
    member: z.string().optional(),
    ssn: z.string().optional(),
    gravidity: z.string().optional(),
    parity: z.string().optional(),
    lmc: z.date().optional(),
    edc: z.date().optional(),
    ecFirstName: z.string().optional(),
    ecMiddleName: z.string().optional(),
    ecLastName: z.string().optional(),
    ecContactNumber: z.string().optional(),
    ecRelationship: z.string().optional(),
    profileImage: z.any().optional(),
    profileImageUrl: z.string().optional(),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

export default function PatientForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [filePreview, setFilePreview] = React.useState<string | null>(null);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

    // Initialize form
    const form = useForm<PatientFormValues>({
        resolver: zodResolver(patientFormSchema),
        defaultValues: {
            firstName: "",
            middleName: "",
            lastName: "",
            age: "",
            birthDate: new Date(),
            contactNumber: "",
            citizenship: "",
            address: "",
            maritalStatus: "",
            religion: "",
            occupation: "",
            member: "",
            ssn: "",
            gravidity: "",
            parity: "",
            lmc: undefined,
            edc: undefined,
            ecFirstName: "",
            ecMiddleName: "",
            ecLastName: "",
            ecContactNumber: "",
            ecRelationship: "",
            profileImage: null,
            profileImageUrl: "",
        },
    });

    // Handle file selection and preview
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            form.setValue("profileImage", file);

            if (file.type.startsWith('image/')) {
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
    const onSubmit = async (data: PatientFormValues) => {
        try {
            setIsSubmitting(true);
            let profileImageUrl: string | null = null;

            // Upload profile picture to Supabase storage
            if (selectedFile) {
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

                const { data: publicUrlData } = supabase.storage
                    .from("profile-pictures")
                    .getPublicUrl(uploadData.path);

                profileImageUrl = publicUrlData.publicUrl;
                console.log("Profile picture uploaded successfully, URL:", profileImageUrl);
            }

            // Prepare patient data with profileImageUrl
            const patientData = {
                ...data,
                profileImageUrl: profileImageUrl ?? undefined, // Ensure undefined instead of null
            };

            // Call createPatient to insert into person table
            await createPatient(patientData);
            toast.success("Patient Added Successfully", {
                description: `${data.firstName} ${data.middleName || ""} ${data.lastName} has been added.`,
            });

            // Reset form and states
            form.reset();
            setFilePreview(null);
            setSelectedFile(null);
            router.push("/Dashboard/Patients");
        } catch (error) {
            console.error("Error submitting form:", error);
            toast.error("Error Adding Patient", {
                description: error instanceof Error ? error.message : "Unknown error occurred",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

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
                                name="maritalStatus"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Marital Status</FormLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger id="maritalStatus" className="col-span-3">
                                                <SelectValue placeholder="Select marital status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Single">Single</SelectItem>
                                                <SelectItem value="Married">Married</SelectItem>
                                                <SelectItem value="Divorced">Divorced</SelectItem>
                                                <SelectItem value="Widowed">Widowed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="occupation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Occupation</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter occupation" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
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
                                            <Input placeholder="Enter religion" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="member"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Member</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter health insurance organization" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ssn"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Social Security Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter SSN" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormField
                                control={form.control}
                                name="gravidity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Gravidity</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="G" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="parity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Parity</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="P" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lmc"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Menstrual Cycle</FormLabel>
                                        <FormControl>
                                            <DatePicker value={field.value} onChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="edc"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Expected Date of Confinement</FormLabel>
                                        <FormControl>
                                            <DatePicker value={field.value} onChange={field.onChange} />
                                        </FormControl>
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

                    <div className="justify-end gap-2ml-auto flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            onClick={() => {
                                form.reset();
                                setFilePreview(null);
                                setSelectedFile(null);
                                router.push("/Dashboard/Patients");
                            }}
                        >
                            <CircleX />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Discard</span>
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className=" h-4 w-4 animate-spin" />
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