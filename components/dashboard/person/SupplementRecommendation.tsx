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
    append?: (supplement: any) => void;
    remove?: (index: number) => void;
    appointment_id?: string | null;
};

const formSchema = z.object({
    name: z.string().min(1, "Supplement name is required"),
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

// Add common supplement options
const COMMON_SUPPLEMENTS = [
    { name: "Prenatal Multivitamin", strength: "Multiple", amount: "1 tablet", frequency: "Once daily", route: "Oral" },
    { name: "Omega-3 DHA", strength: "200mg", amount: "1 capsule", frequency: "Once daily", route: "Oral" },
    { name: "Vitamin B12", strength: "1000mcg", amount: "1 tablet", frequency: "Once daily", route: "Oral" },
    { name: "Vitamin C", strength: "500mg", amount: "1 tablet", frequency: "Once daily", route: "Oral" },
    { name: "Zinc", strength: "15mg", amount: "1 tablet", frequency: "Once daily", route: "Oral" },
    { name: "Probiotics", strength: "Multiple strains", amount: "1 capsule", frequency: "Once daily", route: "Oral" },
];

export default function SupplementRecommendation({
    context,
    id,
    fields = [],
    append,
    remove,
    appointment_id,
}: Props) {
    const [openDialog, setOpenDialog] = useState(false);
    const [supplementsData, setSupplementsData] = useState<any[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [clinicians, setClinicians] = useState<Clinician[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<string>("");
    const [showSupplementDropdown, setShowSupplementDropdown] = useState(false);
    const { isAdmin } = useIsAdmin();
    const { userData } = useCurrentUser();

    // Add console logs to check user data
    useEffect(() => {
        console.log("=== Supplement Recommendation Component - User Authentication State ===");
        console.log("Current User Data:", userData);
        console.log("Is Admin?", userData?.isAdmin);
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
            console.log("=== Supplement Recommendation Component - Fetching Clinicians ===");
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
                        form.setValue("clinician_id", cliniciansData[0].id.toString());
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

    // Fetch supplements
    useEffect(() => {
        async function fetchSupplements() {
            if (!id) {
                setSupplementsData(fields);
                setFetchError(null);
                return;
            }
            try {
                const query = supabase
                    .from("supplements")
                    .select(`
                        *,
                        clinicians (
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
                    console.error("Supplement fetch error:", error);
                    setFetchError("Failed to fetch supplements.");
                    toast("Error", {
                        description: "Failed to fetch supplements.",
                    });
                    setSupplementsData([]);
                    return;
                }

                const formattedData = data.map((supplement: any) => {
                    const clinicianName = supplement.clinicians?.person
                        ? [
                              supplement.clinicians.person.first_name,
                              supplement.clinicians.person.middle_name,
                              supplement.clinicians.person.last_name,
                          ]
                              .filter((part) => part != null && part !== "")
                              .join(" ") || "Unknown Clinician"
                        : "Unknown Clinician";

                    const patientName = supplement.patients?.person
                        ? [
                              supplement.patients.person.first_name,
                              supplement.patients.person.middle_name,
                              supplement.patients.person.last_name,
                          ]
                              .filter((part) => part != null && part !== "")
                              .join(" ") || "Unknown Patient"
                        : "Unknown Patient";

                    if (!supplement.clinicians?.person?.first_name) {
                        console.warn(`Missing clinician name for supplement ID ${supplement.id}:`, supplement.clinicians);
                    }

                    return {
                        ...supplement,
                        clinician: clinicianName,
                        patient: patientName,
                        date: supplement.date ? new Date(supplement.date).toLocaleDateString() : "N/A",
                        status: supplement.status || "Active",
                    };
                });
                setSupplementsData(formattedData);
                setFetchError(null);
                if (append) {
                    formattedData.forEach((supplement: any) => {
                        append({
                            ...supplement
                        });
                    });
                }
            } catch (err) {
                console.error("Unexpected error fetching supplements:", err);
                setFetchError("Unexpected error fetching supplements.");
                toast("Error", {
                    description: "Unexpected error fetching supplements.",
                });
                setSupplementsData([]);
            }
        }

        fetchSupplements();
    }, [id, fields, append, context]);

    const onSubmitSupplement = async (data: FormValues) => {
        if (!id && !append) {
            toast.error("Cannot add supplement without form integration.");
            return;
        }

        try {
            if (id) {
                const supplementData = {
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

                const { data: newSupplement, error } = await supabase
                    .from("supplements")
                    .insert([supplementData])
                    .select()
                    .single();

                if (error) {
                    console.error("Error adding supplement:", error);
                    toast.error(`Failed to add supplement: ${error.message}`);
                    return;
                }

                const clinicianName = clinicians.find((c) => c.id === data.clinician_id)?.full_name || "Unknown Clinician";
                if (clinicianName === "Unknown Clinician") {
                    console.warn(`No clinician found for clinician_id ${data.clinician_id} during supplement insert`);
                }

                if (append) {
                    append({
                        id: newSupplement.id,
                        name: data.name,
                        strength: data.strength,
                        amount: data.amount,
                        frequency: data.frequency,
                        route: data.route,
                        clinician_id: data.clinician_id,
                        clinician: clinicianName,
                        appointment_id: appointment_id,
                        status: newSupplement.status,
                        date: new Date(newSupplement.date).toLocaleDateString(),
                    });
                } else {
                    setSupplementsData((prev) => [
                        ...prev,
                        {
                            id: newSupplement.id,
                            name: data.name,
                            strength: data.strength,
                            amount: data.amount,
                            frequency: data.frequency,
                            route: data.route,
                            clinician_id: data.clinician_id,
                            clinician: clinicianName,
                            appointment_id: appointment_id,
                            status: newSupplement.status,
                            date: new Date(newSupplement.date).toLocaleDateString(),
                        },
                    ]);
                }
                toast.success("Supplement Added", {
                    description: "New supplement has been added successfully.",
                });
            } else if (append) {
                const clinicianName = clinicians.find((c) => c.id === data.clinician_id)?.full_name || "Unknown Clinician";
                if (clinicianName === "Unknown Clinician") {
                    console.warn(`No clinician found for clinician_id ${data.clinician_id} during supplement append`);
                }

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
                    date: new Date().toLocaleDateString(),
                });
                toast.success("Supplement Added", {
                    description: "New supplement has been added successfully.",
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
            console.error("Error saving supplement:", err);
            toast.error(`Failed to save supplement: ${err.message || 'Unknown error'}`);
        }
    };

    const handleDelete = async (index: number) => {
        try {
            if (id) {
                const supplementToDelete = (fields.length > 0 ? fields : supplementsData)[index];
                const { error } = await supabase
                    .from("supplements")
                    .delete()
                    .eq("id", supplementToDelete.id);

                if (error) {
                    console.error("Supplement delete error:", error);
                    toast("Error", {
                        description: `Failed to delete supplement: ${error.message}`,
                    });
                    return;
                }

                setSupplementsData((prev) => prev.filter((_, idx) => idx !== index));
            }

            if (remove) {
                remove(index);
            }
            toast("Supplement Deleted", {
                description: "Supplement has been removed from the list.",
            });
        } catch (err) {
            console.error("Unexpected error deleting supplement:", err);
            toast("Error", {
                description: "An unexpected error occurred while deleting the supplement.",
            });
        }
    };

    const handleStatusChange = async (index: number, newStatus: string) => {
        try {
            const supplementToUpdate = (fields.length > 0 ? fields : supplementsData)[index];
            if (id) {
                const { error } = await supabase
                    .from("supplements")
                    .update({ status: newStatus })
                    .eq("id", supplementToUpdate.id);

                if (error) {
                    console.error("Supplement status update error:", error);
                    toast("Error", {
                        description: `Failed to update supplement status: ${error.message}`,
                    });
                    return;
                }
            }

            setSupplementsData((prev) =>
                prev.map((supp, idx) =>
                    idx === index ? { ...supp, status: newStatus } : supp
                )
            );

            if (fields.length > 0 && append) {
                append({
                    ...supplementToUpdate,
                    status: newStatus,
                });
            }

            toast.success("Status Updated", {
                description: `Supplement status changed to ${newStatus}.`,
            });
        } catch (err) {
            console.error("Unexpected error updating status:", err);
            toast("Error", {
                description: "An unexpected error occurred while updating the status.",
            });
        }
    };

    const displaySupplements = fields.length > 0 ? fields : supplementsData;

    // Filter supplements based on search term, status, and date
    const filteredSupplements = displaySupplements.filter((supplement) => {
        const matchesSearch =
            supplement.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (context === 'patient' 
                ? supplement.clinician?.toLowerCase().includes(searchTerm.toLowerCase())
                : supplement.patient?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === "all" || supplement.status.toLowerCase() === statusFilter.toLowerCase();

        const matchesDate = !dateFilter ||
            (supplement.date && new Date(supplement.date).toLocaleDateString() === new Date(dateFilter).toLocaleDateString());

        return matchesSearch && matchesStatus && matchesDate;
    });

    return (
        <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <CardTitle>Supplements</CardTitle>
                    <CardDescription>
                        {context === 'patient'
                            ? "Identify your patient's supplements before it's too late"
                            : "View all supplements you have given to patients"}
                    </CardDescription>
                </div>
                <div className="relative flex items-center">
                    {context === 'patient' && (
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
                                        Add Supplement
                                    </span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[1000px]">
                                <DialogHeader>
                                    <DialogTitle>Add Supplement</DialogTitle>
                                    <DialogDescription>
                                        Add a new supplement to your patient. Click save when you're done!
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmitSupplement)}>
                                        <div className="grid grid-cols-3 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <FormLabel>Supplement</FormLabel>
                                                        <div className="relative">
                                                            <FormControl>
                                                                <Input
                                                                    {...field}
                                                                    placeholder="Type or select supplement..."
                                                                    onChange={(e) => {
                                                                        field.onChange(e.target.value);
                                                                        // Clear other fields when typing custom
                                                                        form.setValue("strength", "");
                                                                        form.setValue("amount", "");
                                                                        form.setValue("frequency", "");
                                                                        form.setValue("route", "");
                                                                    }}
                                                                    onFocus={() => setShowSupplementDropdown(true)}
                                                                    onBlur={(e) => {
                                                                        // Check if the related target is in the dropdown
                                                                        const dropdown = e.currentTarget.parentElement?.querySelector('.supplement-dropdown');
                                                                        if (!dropdown?.contains(e.relatedTarget)) {
                                                                            setShowSupplementDropdown(false);
                                                                        }
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            {showSupplementDropdown && (
                                                                <div 
                                                                    className="supplement-dropdown absolute w-full z-10 top-[100%] max-h-[200px] overflow-auto rounded-md border bg-popover p-0 text-popover-foreground shadow-md"
                                                                    onMouseDown={(e) => {
                                                                        // Prevent blur from hiding dropdown when clicking options
                                                                        e.preventDefault();
                                                                    }}
                                                                >
                                                                    {COMMON_SUPPLEMENTS.map((supplement) => (
                                                                        <div
                                                                            key={supplement.name}
                                                                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                                                            onMouseDown={() => {
                                                                                form.setValue("name", supplement.name);
                                                                                form.setValue("strength", supplement.strength);
                                                                                form.setValue("amount", supplement.amount);
                                                                                form.setValue("frequency", supplement.frequency);
                                                                                form.setValue("route", supplement.route);
                                                                                setShowSupplementDropdown(false);
                                                                            }}
                                                                        >
                                                                            {supplement.name}
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
                                                    <FormItem>
                                                        <FormLabel>Strength</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="amount"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Amount</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="frequency"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Frequency</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="route"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Route</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
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
                                                        <FormControl>
                                                            <Select
                                                                onValueChange={field.onChange}
                                                                value={field.value}
                                                                disabled={!userData?.isAdmin}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select clinician" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {clinicians.map((clinician) => (
                                                                        <SelectItem key={clinician.id} value={clinician.id}>
                                                                            {clinician.full_name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit">Save supplement</Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px] max-w-[790px]">
                            <Input
                                type="search"
                                placeholder="Search by name or clinician/patient..."
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
                ) : filteredSupplements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {searchTerm || statusFilter !== "all" || dateFilter
                            ? "No supplements found matching the search criteria."
                            : context === 'patient'
                                ? "No supplements recorded for this patient."
                                : "No supplements given by this clinician."}
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableCell>
                                    <Checkbox id="select-all" />
                                </TableCell>
                                <TableHead>Supplement</TableHead>
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
                            {filteredSupplements.map((supplement, index) => (
                                <TableRow key={supplement.id || index}>
                                    <TableCell>
                                        <Checkbox id={`supplement-${supplement.id || index}`} />
                                    </TableCell>
                                    <TableCell className="font-medium">{supplement.name}</TableCell>
                                    <TableCell>{supplement.strength}</TableCell>
                                    <TableCell>{supplement.amount}</TableCell>
                                    <TableCell>{supplement.frequency}</TableCell>
                                    <TableCell>{supplement.route}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={supplement.status}
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
                                        {context === 'patient' ? supplement.clinician : supplement.patient}
                                    </TableCell>
                                    <TableCell>{supplement.date}</TableCell>
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
                    Showing <strong>{filteredSupplements.length}</strong> of{" "}
                    <strong>{displaySupplements.length}</strong> Supplements
                </div>
            </CardFooter>
        </Card>
    );
}