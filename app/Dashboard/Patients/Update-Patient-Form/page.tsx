"use client";

import { Suspense } from "react";
import UpdatePatientForm from "@/components/dashboard/person/patients/UpdatePatientForm";

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UpdatePatientForm />
    </Suspense>
  );
}
