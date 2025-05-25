import { supabase } from '../client';
import { PatientFormValues } from '@/components/dashboard/person/patients/PatientForm'
import { ClinicianFormValues } from '@/components/dashboard/person/clinicians/ClinicianForm'

export async function createPersonRecord(data: PatientFormValues | ClinicianFormValues) {
    return await supabase
    .from('person')
    .insert({
        first_name: data.firstName,
        middle_name: data.middleName || null,
        last_name: data.lastName,
        birth_date: data.birthDate.toISOString().split('T')[0],
        religion: data.religion || null,
        age: data.age,
        contact_number: data.contactNumber,
        citizenship: data.citizenship || null,
        address: data.address || null,
        status: "Active",
        ec_first_name: data.ecFirstName || null,
        ec_middle_name: data.ecMiddleName || null,
        ec_last_name: data.ecLastName || null,
        ec_contact_number: data.ecContactNumber || null,
        ec_relationship: data.ecRelationship || null,
        fileurl: data.profileImageUrl || null,
    })
    .select('id')
    .single();
}