import { supabase } from "../client";
import { ClinicianFormValues } from "@/components/dashboard/person/clinicians/ClinicianForm";

export async function createClinicianRecord(data: ClinicianFormValues, personId: string) {
    console.log('createClinicianRecord: Creating clinician record with data:', {
        id: personId,
        role: data.role,
        license_number: data.LicenseNumber,
        specialization: data.specialization,
        // Don't log password
    });

    const { data: result, error } = await supabase
        .from('clinicians')
        .insert({
            id: personId,
            role: data.role,
            license_number: data.LicenseNumber,
            specialization: data.specialization,
            password: data.password
        })
        .select()
        .single();

    if (error) {
        console.error('createClinicianRecord: Error creating clinician record:', error);
        return { error };
    }

    console.log('createClinicianRecord: Successfully created clinician record');
    return { data: result, error: null };
}