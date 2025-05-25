"use client";

import { Suspense } from "react";
import PatientView from "@/components/dashboard/person/patients/PatientView";

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PatientView />
    </Suspense>
  );
}
