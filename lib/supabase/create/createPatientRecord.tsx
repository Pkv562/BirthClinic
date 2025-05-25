import { supabase } from "../client";
import { PatientFormValues } from "@/components/dashboard/person/patients/PatientForm";

export async function createPatientRecord(data: PatientFormValues, personId: string) {
    return await supabase
    .from('patients')
    .insert({
        id: personId,
        gravidity: data.gravidity || null,
        parity: data.parity || null,
        last_menstrual_cycle: data.lmc ? data.lmc.toISOString().split('T')[0] : null,
        expected_date_of_confinement: data.edc ? data.edc.toISOString().split('T')[0] : null,
        member: data.member || null,
        ssn: data.ssn || null,
        occupation: data.occupation || null,
        marital_status: data.maritalStatus || null,
    });
}