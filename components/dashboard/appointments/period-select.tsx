import * as React from "react";
import { Button } from "@/components/ui/button";
import type { Period } from "./time-picker-utils";

interface TimePeriodSelectProps extends React.ComponentPropsWithoutRef<"div"> {
  period: Period;
  setPeriod: (period: Period) => void;
  date?: Date;
  setDate?: (date: Date | undefined) => void;
  onLeftFocus?: () => void;
}

export const TimePeriodSelect = React.forwardRef<HTMLButtonElement, TimePeriodSelectProps>(
  ({ period, setPeriod }, ref) => (
    <div className="flex gap-1">
      <Button
        ref={ref}
        type="button"
        variant={period === "AM" ? "default" : "ghost"}
        onClick={() => setPeriod("AM")}
        className="px-2"
      >
        AM
      </Button>
      <Button
        type="button"
        variant={period === "PM" ? "default" : "ghost"}
        onClick={() => setPeriod("PM")}
        className="px-2"
      >
        PM
      </Button>
    </div>
  )
);

TimePeriodSelect.displayName = "TimePeriodSelect";