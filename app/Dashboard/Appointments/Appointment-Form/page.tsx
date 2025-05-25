"use client";

import { useState } from "react";
import AppointmentForm from "@/components/dashboard/appointments/AppointmentForm";

export default function Dashboard() {
  const [open, setOpen] = useState(true);

  return (
    <AppointmentForm
      open={open}
      onOpenChange={setOpen}
      onSuccess={() => setOpen(false)}
    />
  );
}
