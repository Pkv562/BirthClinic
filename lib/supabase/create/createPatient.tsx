import { supabase } from '../client';
import { createPersonRecord } from './createPersonRecord';
import { createPatientRecord } from './createPatientRecord';
import { PatientFormValues } from '@/components/dashboard/person/patients/PatientForm'

export async function getPersonIdByName(firstName: string, lastName: string) {
    const { data, error } = await supabase
    .from('person')
    .select('id')
    .eq('first_name', firstName)
    .eq('last_name', lastName)
    .single();

    if (error) {
        console.error('Query error:', error);
        return null;
    }

    return data.id;
}

export async function createPatient(data: PatientFormValues) {
    try {
        const {data: personData, error : personError} = await createPersonRecord(data);

        if (personError) {
            throw new Error(`Error inserting person data: ${personError.message}`);
        }

        if (!personData || !personData.id) {
            throw new Error('Failed to get person ID after insertion');
        }

        const personId = personData.id;

        const {error: patientError} = await createPatientRecord(data,personId);

        if (patientError) {
            throw new Error(`Error inserting patient data: ${patientError.message}`);
        }
          
        return { success: true, personId };
    } catch (error) {
        console.error("Error in createPatient:", error);
        throw error;
    }
}