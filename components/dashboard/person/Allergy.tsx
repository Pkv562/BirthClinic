"use client"

import React, { useState, useEffect } from "react"
import { Dna, MoreHorizontal, Search, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { supabase } from "@/lib/supabase/client"

type Props = {
  context: "patient"
  id: string | null
  fields?: any[]
  append?: (allergy: any) => void
  remove?: (index: number) => void
}

// Define the form schema for adding allergies
const formSchema = z.object({
  name: z.string().min(1, "Allergy name is required"),
  severity: z.string().min(1, "Severity is required"),
})

type FormValues = z.infer<typeof formSchema>

export default function Allergy({ context, id, fields = [], append, remove }: Props) {
  const [openDialog, setOpenDialog] = useState(false)
  const [allergiesData, setAllergiesData] = useState<any[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Initialize form for adding allergies
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      severity: "",
    },
  })

  // Fetch allergies from Supabase if id is provided (existing patient)
  useEffect(() => {
    async function fetchAllergies() {
      if (!id) return
      try {
        const { data, error } = await supabase
          .from("allergies")
          .select("*")
          .eq("patient_id", id)

        if (error) {
          console.error("Allergy fetch error:", error)
          setFetchError("Failed to fetch allergies.")
          toast("Error", {
            description: "Failed to fetch allergies.",
          })
          setAllergiesData([])
        } else {
          console.log("Fetched allergies for patient_id", id, ":", data)
          setAllergiesData(data)
          setFetchError(null)
          if (append) {
            // Only append new allergies to avoid duplicates
            data.forEach((allergy: any) => {
              if (!fields.some((f) => f.id === allergy.id)) {
                append({ id: allergy.id, name: allergy.name, severity: allergy.severity })
              }
            })
          }
        }
      } catch (err) {
        console.error("Unexpected error fetching allergies:", err)
        setFetchError("Unexpected error fetching allergies.")
        toast("Error", {
          description: "Unexpected error fetching allergies.",
        })
        setAllergiesData([])
      }
    }

    fetchAllergies()
  }, [id, append])

  // Sync fields with allergiesData for new patients or when fields change
  useEffect(() => {
    if (!id) {
      setAllergiesData(fields)
      setFetchError(null)
    }
  }, [id, fields])

  // Handle form submission for adding allergies
  const onSubmitAllergy = async (data: FormValues) => {
    if (!id && !append) {
      toast("Error", {
        description: "Cannot add allergy without form integration.",
      })
      return
    }

    if (id) {
      // Existing patient, save to Supabase
      const { data: newAllergy, error } = await supabase
        .from("allergies")
        .insert([
          {
            patient_id: id,
            name: data.name,
            severity: data.severity,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Allergy insert error:", error)
        toast("Error", {
          description: "Failed to add allergy.",
        })
        return
      }

      if (append) {
        append({
          id: newAllergy.id,
          name: data.name,
          severity: data.severity,
        })
      } else {
        setAllergiesData((prev) => [...prev, newAllergy])
      }
      toast("Allergy Added", {
        description: "New allergy has been added successfully.",
      })
    } else if (append) {
      // New patient, append to form's allergies array
      append({
        name: data.name,
        severity: data.severity,
      })
      toast("Allergy Added", {
        description: "New allergy has been added successfully.",
      })
    }

    form.reset({ name: "", severity: "" })
    setOpenDialog(false)
  }

  // Handle allergy deletion
  const handleDelete = async (index: number) => {
    if (id) {
      // Existing patient, delete from Supabase
      const allergyToDelete = (fields.length > 0 ? fields : allergiesData)[index]
      const { error } = await supabase
        .from("allergies")
        .delete()
        .eq("id", allergyToDelete.id)

      if (error) {
        console.error("Allergy delete error:", error)
        toast("Error", {
          description: "Failed to delete allergy.",
        })
        return
      }

      setAllergiesData((prev) => prev.filter((_, idx) => idx !== index))
    }

    if (remove) {
      remove(index)
    }
    toast("Allergy Deleted", {
      description: "Allergy has been removed from the list.",
    })
  }

  // Filter allergies based on search term
  const displayAllergies = fields.length > 0 ? fields : allergiesData
  const filteredAllergies = displayAllergies.filter((allergy) => {
    const matchesSearch = !searchTerm || allergy.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle>Allergies</CardTitle>
          <CardDescription>Identify your patient's allergies before it's too late</CardDescription>
        </div>
        <Dialog
          open={openDialog}
          onOpenChange={(open) => {
            setOpenDialog(open)
            if (!open) {
              form.reset({ name: "", severity: "" })
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 ml-2 flex items-center gap-1">
              <Dna className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add Allergy</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Allergy</DialogTitle>
              <DialogDescription>Add a new allergy to your patient. Click save when you're done!</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitAllergy)} className="grid gap-4 py-4">
                <div className="grid grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-center gap-2">
                        <FormLabel htmlFor="allergy" className="text-right">
                          Allergy
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="allergy"
                            placeholder="Enter allergy"
                            className="col-span-4"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="col-span-4" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-center gap-2 ml-5">
                        <FormLabel htmlFor="severity" className="text-right">
                          Severity
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger id="severity" className="col-span-4">
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Mild">Mild</SelectItem>
                            <SelectItem value="Moderate">Moderate</SelectItem>
                            <SelectItem value="Severe">Severe</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="col-span-4" />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Save allergy</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="search"
                placeholder="Search by name or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {fetchError ? (
          <p className="text-sm text-red-600">{fetchError}</p>
        ) : filteredAllergies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {searchTerm
              ? "No allergies found matching the search criteria."
              : "No allergies recorded for this patient."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox />
                </TableHead>
                <TableHead>Allergy</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAllergies.map((allergy, index) => (
                <TableRow key={allergy.id || index}>
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell className="font-medium">{allergy.name}</TableCell>
                  <TableCell>{allergy.severity}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{filteredAllergies.length}</strong> of{" "}
          <strong>{displayAllergies.length}</strong> Allergies
        </div>
      </CardFooter>
    </Card>
  )
}