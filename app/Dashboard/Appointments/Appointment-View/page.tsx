"use client";

import { Suspense } from "react";
import AppointmentView from "@/components/dashboard/appointments/AppointmentView";

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AppointmentView />
    </Suspense>
  );
}

