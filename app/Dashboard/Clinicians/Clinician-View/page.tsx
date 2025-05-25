"use client";

import { Suspense } from "react";
import ClinicianView from "@/components/dashboard/person/clinicians/ClinicianView";

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClinicianView />
    </Suspense>
  );
}
