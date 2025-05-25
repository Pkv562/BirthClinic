"use client";

import { Suspense } from "react";
import UpdateClinicianForm from "@/components/dashboard/person/clinicians/UpdateClinicianForm";

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UpdateClinicianForm />
    </Suspense>
  );
}
