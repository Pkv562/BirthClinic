"use client";

import * as React from "react";
import { TimePicker12Demo as TimePicker12DemoComponent } from "@/components/dashboard/appointments/TimePicker12Demo";

interface TimePicker12DemoProps {
  date: Date;
  setDate: (date: Date | undefined) => void;
}

function TimePicker12Demo(props: TimePicker12DemoProps) {
  return <TimePicker12DemoComponent {...props} />;
}

export default TimePicker12Demo;