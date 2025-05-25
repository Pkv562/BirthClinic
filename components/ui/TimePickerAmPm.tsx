"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TimePickerAmPmProps {
  value?: string // format: "hh:mm AM/PM"
  onChange: (val: string) => void
}

export function TimePickerAmPm({ value, onChange }: TimePickerAmPmProps) {
  const [open, setOpen] = React.useState(false)
  const [hour, setHour] = React.useState<string>("")
  const [minute, setMinute] = React.useState<string>("00")
  const [ampm, setAmPm] = React.useState<"AM" | "PM">("AM")

  React.useEffect(() => {
    if (value) {
      const [time, period] = value.split(" ")
      const [h, m] = time.split(":")
      setHour(h)
      setMinute(m)
      setAmPm(period === "PM" ? "PM" : "AM")
    }
  }, [value])

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"))
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"))

  const handleSelect = (h: string, m: string, ap: "AM" | "PM") => {
    setHour(h)
    setMinute(m)
    setAmPm(ap)
    onChange(`${h}:${m} ${ap}`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal">
          {value || "Select time"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="flex gap-2">
          <ScrollArea className="h-32 w-16">
            <div className="flex flex-col">
              {hours.map((h) => (
                <Button
                  key={h}
                  variant={hour === h ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setHour(h)
                    onChange(`${h}:${minute} ${ampm}`)
                  }}
                >
                  {h}
                </Button>
              ))}
            </div>
          </ScrollArea>
          <span className="flex items-center px-1">:</span>
          <ScrollArea className="h-32 w-16">
            <div className="flex flex-col">
              {minutes.map((m) => (
                <Button
                  key={m}
                  variant={minute === m ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setMinute(m)
                    onChange(`${hour || "01"}:${m} ${ampm}`)
                  }}
                >
                  {m}
                </Button>
              ))}
            </div>
          </ScrollArea>
          <div className="flex flex-col ml-2">
            {["AM", "PM"].map((ap) => (
              <Button
                key={ap}
                variant={ampm === ap ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setAmPm(ap as "AM" | "PM")
                  onChange(`${hour || "01"}:${minute} ${ap}`)
                }}
              >
                {ap}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            onClick={() => handleSelect(hour || "01", minute, ampm)}
          >
            Set
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}