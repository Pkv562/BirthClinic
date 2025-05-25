"use client"

import { useRouter } from "next/navigation"
import { FileDown, MonitorUp, MoreHorizontal, Search, Trash2, X } from "lucide-react"
import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
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
import { Separator } from "@radix-ui/react-dropdown-menu"

const formSchema = z.object({
  filename: z.string().min(1, "File name is required"),
  type: z.string().min(1, "Record type is required"),
  doctor: z.string().min(1, "Doctor name is required"),
  ordered_date: z.string().min(1, "Ordered date is required"),
  received_date: z.string().min(1, "Received date is required"),
  reported_date: z.string().min(1, "Reported date is required"),
  impressions: z.string().min(1, "Impressions are required"),
  remarks: z.string().optional(),
  recommendations: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  context: "patient"
  id: string | null
  fields?: any[]
  append?: (record: any) => void
  remove?: (index: number) => void
}

export default function LaboratoryRecords({ context, id, fields = [], append, remove }: Props) {
  const router = useRouter()
  const [openDialog, setOpenDialog] = useState(false)
  const [recordsData, setRecordsData] = useState<any[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("")

  const today = new Date().toISOString().split('T')[0]

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      filename: "",
      type: "",
      doctor: "",
      ordered_date: today,
      received_date: today,
      reported_date: today,
      impressions: "",
      remarks: "",
      recommendations: "",
      company: "",
      notes: "",
    },
  })

  useEffect(() => {
    async function fetchRecords() {
      if (!id) return
      try {
        const { data, error } = await supabase
          .from("laboratory_records")
          .select("*")
          .eq("patient_id", id)

        if (error) {
          console.error("Record fetch error:", error)
          setFetchError("Failed to fetch laboratory records.")
          toast.error("Failed to fetch laboratory records.")
          setRecordsData([])
        } else {
          console.log("Fetched records for patient_id", id, ":", data)
          setRecordsData(data)
          setFetchError(null)
          if (append) {
            data.forEach((record: any) => {
              if (!fields.some((f) => f.id === record.id)) {
                append({
                  id: record.id,
                  filename: record.filename,
                  type: record.type,
                  doctor: record.doctor,
                  ordered_date: record.ordered_date,
                  received_date: record.received_date,
                  reported_date: record.reported_date,
                  impressions: record.impressions,
                  remarks: record.remarks,
                  recommendations: record.recommendations,
                  company: record.company,
                  notes: record.notes,
                  fileurl: record.fileurl,
                })
              }
            })
          }
        }
      } catch (err) {
        console.error("Unexpected error fetching records:", err)
        setFetchError("Unexpected error fetching records.")
        toast.error("Unexpected error fetching records.")
        setRecordsData([])
      }
    }

    fetchRecords()
  }, [id, append, fields])

  useEffect(() => {
    if (!id) {
      setRecordsData(fields)
      setFetchError(null)
    }
  }, [id, fields])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.includes('pdf') && !file.type.startsWith('image/')) {
        toast.error('Please upload a valid PDF or image file.')
        return
      }
      setSelectedFile(file)
      form.setValue('filename', file.name)

      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setFilePreview(null)
      }
    }
  }

  const formatDate = (date: string | Date): string => {
    if (!date) return today
    if (typeof date === 'string') {
      if (date.includes('T')) {
        return date.split('T')[0]
      }
      return date
    }
    return date.toISOString().split('T')[0]
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      const filePath = url.split('laboratory-files/')[1]
      const { data, error } = await supabase.storage
        .from('laboratory-files')
        .createSignedUrl(filePath, 3600)

      if (error) {
        throw error
      }

      console.log('Signed URL:', data.signedUrl)

      const response = await fetch(data.signedUrl)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      console.log('Downloaded blob:', {
        size: blob.size,
        type: blob.type,
      })

      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()

      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      toast.success('Download started')
    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Failed to download file')
    }
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
    setSelectedRecord(null)
    setIsPreviewOpen(false)
    setPreviewUrl(null)
  }

  const getFileUrl = async (filePath: string) => {
    try {
      const path = filePath.split('laboratory-files/')[1] || filePath
      const { data } = await supabase.storage
        .from('laboratory-files')
        .createSignedUrl(path, 3600)

      return data?.signedUrl || filePath
    } catch (error) {
      console.error('Error generating file URL:', error)
      return filePath
    }
  }

  const openPreview = async (url: string) => {
    try {
      const filePath = url.split('laboratory-files/')[1]
      const { data, error } = await supabase.storage
        .from('laboratory-files')
        .createSignedUrl(filePath, 3600)

      if (error) {
        throw error
      }

      const response = await fetch(data.signedUrl)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      console.log('Preview URL:', blobUrl)
      setPreviewUrl(blobUrl)
      setIsPreviewOpen(true)
    } catch (error) {
      console.error('Error opening preview:', error)
      toast.error('Failed to open file preview')
    }
  }

  const onSubmitRecord = async (data: FormValues) => {
    try {
      if (!selectedFile) {
        toast.error('Please select a file.')
        return
      }

      if (selectedFile.type === 'application/pdf') {
        const reader = new FileReader()
        const isValidPDF = await new Promise<boolean>((resolve) => {
          reader.onload = (e) => {
            const text = e.target?.result as string
            resolve(text.startsWith('%PDF-'))
          }
          reader.onerror = () => resolve(false)
          reader.readAsText(selectedFile, 'UTF-8')
        })

        if (!isValidPDF) {
          toast.error('The selected file is not a valid PDF.')
          return
        }
      }

      if (!id && !append) {
        toast.error('Cannot add record without form integration.')
        return
      }

      setIsUploading(true)

      const formattedData = {
        ...data,
        ordered_date: formatDate(data.ordered_date),
        received_date: formatDate(data.received_date),
        reported_date: formatDate(data.reported_date),
      }

      console.log('Submitting record with data:', formattedData)

      let fileurl: string | null = null
      if (selectedFile) {
        console.log('Uploading file:', {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
        })
        const fileExt = selectedFile.name.split('.').pop()
        const uniquePrefix = `${id || 'new'}_${Date.now()}`
        const fileName = `${uniquePrefix}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('laboratory-files')
          .upload(fileName, selectedFile, {
            contentType: selectedFile.type,
          })

        if (uploadError) {
          console.error('File upload error:', uploadError)
          toast.error('Failed to upload file: ' + uploadError.message)
          setIsUploading(false)
          return
        }

        const { data: publicUrlData } = supabase.storage
          .from('laboratory-files')
          .getPublicUrl(uploadData.path)

        fileurl = publicUrlData.publicUrl
        console.log('File uploaded successfully, URL:', fileurl)
      }

      if (id) {
        const { data: newRecord, error } = await supabase
          .from('laboratory_records')
          .insert([
            {
              patient_id: id,
              filename: data.filename,
              type: data.type,
              doctor: data.doctor,
              ordered_date: data.ordered_date,
              received_date: data.received_date,
              reported_date: data.reported_date,
              impressions: data.impressions,
              remarks: data.remarks,
              recommendations: data.recommendations,
              company: data.company,
              notes: data.notes,
              fileurl: fileurl,
            },
          ])
          .select()
          .single()

        if (error) {
          console.error('Record insert error:', error)
          toast.error('Failed to add record: ' + error.message)
          setIsUploading(false)
          return
        }

        if (append) {
          append({
            id: newRecord.id,
            filename: formattedData.filename,
            type: formattedData.type,
            doctor: formattedData.doctor,
            ordered_date: formattedData.ordered_date,
            received_date: formattedData.received_date,
            reported_date: formattedData.reported_date,
            impressions: formattedData.impressions,
            remarks: formattedData.remarks,
            recommendations: formattedData.recommendations,
            company: formattedData.company,
            notes: formattedData.notes,
            fileurl: fileurl,
          })
        } else {
          setRecordsData((prev) => [...prev, newRecord])
        }
        toast.success('New laboratory record has been added successfully.')
      } else if (append) {
        append({
          filename: formattedData.filename,
          type: formattedData.type,
          doctor: formattedData.doctor,
          ordered_date: formattedData.ordered_date,
          received_date: formattedData.received_date,
          reported_date: formattedData.reported_date,
          impressions: formattedData.impressions,
          remarks: formattedData.remarks,
          recommendations: formattedData.recommendations,
          company: formattedData.company,
          notes: formattedData.notes,
          fileurl: fileurl,
        })
        toast.success('New laboratory record has been added successfully.')
      }

      form.reset({
        filename: "",
        type: "",
        doctor: "",
        ordered_date: today,
        received_date: today,
        reported_date: today,
        impressions: "",
        remarks: "",
        recommendations: "",
        company: "",
        notes: "",
      })
      setSelectedFile(null)
      setFilePreview(null)
      setOpenDialog(false)
    } catch (error) {
      console.error('Error in onSubmitRecord:', error)
      toast.error('An unexpected error occurred while saving the record.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (index: number) => {
    if (id) {
      const recordToDelete = (fields.length > 0 ? fields : recordsData)[index]
      const { error } = await supabase
        .from('laboratory_records')
        .delete()
        .eq('id', recordToDelete.id)

      if (error) {
        console.error('Record delete error:', error)
        toast.error('Failed to delete record: ' + error.message)
        return
      }

      setRecordsData((prev) => prev.filter((_, idx) => idx !== index))
    }

    if (remove) {
      remove(index)
    }

    setIsSidebarOpen(false)
    setIsPreviewOpen(false)
    setSelectedRecord(null)
    setPreviewUrl(null)

    toast.success('Record Deleted', {
      description: 'Laboratory record has been removed from the list.',
    })
  }

  const openRecordDetails = async (record: any) => {
    setSelectedRecord(record)
    setIsSidebarOpen(true)
    await openPreview(record.fileurl)
  }

  // Filter records based on search term, status, and date
  const displayRecords = React.useMemo(() => {
    const data = fields.length > 0 ? fields : recordsData
    if (!searchTerm && statusFilter === "all" && !dateFilter) return data

    return data.filter((record) => {
      const matchesSearch =
        record.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.doctor.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "Ordered" && record.ordered_date) ||
        (statusFilter === "Received" && record.received_date) ||
        (statusFilter === "Reported" && record.reported_date)

      const matchesDate = !dateFilter ||
        (record.ordered_date && formatDate(record.ordered_date) === formatDate(dateFilter))

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [fields, recordsData, searchTerm, statusFilter, dateFilter])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle>Laboratory Records</CardTitle>
          <CardDescription>Store your patient's records for safe keeping</CardDescription>
        </div>
        <div className="relative flex items-center">
          {context === "patient" && (
            <Dialog
              open={openDialog}
              onOpenChange={(open) => {
                setOpenDialog(open)
                if (!open) {
                  form.reset({
                    filename: "",
                    type: "",
                    doctor: "",
                    ordered_date: today,
                    received_date: today,
                    reported_date: today,
                    impressions: "",
                    remarks: "",
                    recommendations: "",
                    company: "",
                    notes: "",
                  })
                  setSelectedFile(null)
                  setFilePreview(null)
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 flex items-center gap-1">
                  <MonitorUp className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add Record</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[1000px]">
                <DialogHeader>
                  <DialogTitle>Add Laboratory Record</DialogTitle>
                  <DialogDescription>
                    Upload a file and fill in the details for the laboratory record.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitRecord)} className="grid gap-4 py-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name="filename"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>File Upload</FormLabel>
                              <FormControl>
                                <Input
                                  type="file"
                                  onChange={handleFileChange}
                                  accept="application/pdf,image/jpeg,image/png"
                                />
                              </FormControl>
                              {filePreview && (
                                <div className="mt-2">
                                  <img
                                    src={filePreview}
                                    alt="File preview"
                                    className="max-h-40 object-contain"
                                  />
                                </div>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="filename"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>File Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter file name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Record Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select record type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Blood Test">Blood Test</SelectItem>
                                <SelectItem value="X-Ray">X-Ray</SelectItem>
                                <SelectItem value="MRI">MRI</SelectItem>
                                <SelectItem value="CT Scan">CT Scan</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="doctor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Doctor</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter doctor name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ordered_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ordered Date</FormLabel>
                            <FormControl>
                              <DatePicker 
                                value={field.value ? new Date(field.value) : undefined} 
                                onChange={(date) => {
                                  if (date) {
                                    field.onChange(date.toISOString().split('T')[0]);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="received_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Received Date</FormLabel>
                            <FormControl>
                              <DatePicker 
                                value={field.value ? new Date(field.value) : undefined} 
                                onChange={(date) => {
                                  if (date) {
                                    field.onChange(date.toISOString().split('T')[0]);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="reported_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reported Date</FormLabel>
                            <FormControl>
                              <DatePicker 
                                value={field.value ? new Date(field.value) : undefined} 
                                onChange={(date) => {
                                  if (date) {
                                    field.onChange(date.toISOString().split('T')[0]);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="impressions"
                        render={({ field }) => (
                          <FormItem className="col-span-3">
                            <FormLabel>Impressions</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter impressions" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="remarks"
                        render={({ field }) => (
                          <FormItem className="col-span-3">
                            <FormLabel>Remarks</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter remarks" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="recommendations"
                        render={({ field }) => (
                          <FormItem className="col-span-3">
                            <FormLabel>Recommendations</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter recommendations" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem className="col-span-3">
                            <FormLabel>Company</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter company" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem className="col-span-3">
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter notes" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isUploading}>
                        {isUploading ? 'Uploading...' : 'Save Record'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="search"
                placeholder="Search by file name or doctor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Ordered">Ordered</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
                <SelectItem value="Reported">Reported</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-[180px]"
            />
          </div>
        </div>
        {fetchError ? (
          <p className="text-sm text-red-600">{fetchError}</p>
        ) : displayRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {searchTerm || statusFilter !== "all" || dateFilter
              ? "No laboratory records found matching the search criteria."
              : "No laboratory records for this patient."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>
                  <Checkbox
                    id="select-all"
                    onCheckedChange={(checked) => {
                      // Implement select all logic if needed
                    }}
                  />
                </TableCell>
                <TableHead>File Name</TableHead>
                <TableHead>Record Type</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Ordered Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRecords.map((record, index) => (
                <TableRow
                  key={record.id || index}
                  onClick={() => openRecordDetails(record)}
                  className="cursor-pointer hover:bg-zinc-100"
                >
                  <TableCell className="py-4">
                    <Checkbox id={`record-${record.id || index}`} />
                  </TableCell>
                  <TableCell className="font-medium">{record.filename}</TableCell>
                  <TableCell>{record.type}</TableCell>
                  <TableCell>{record.doctor}</TableCell>
                  <TableCell>{record.ordered_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{displayRecords.length}</strong> of <strong>{fields.length > 0 ? fields.length : recordsData.length}</strong> Records
        </div>
      </CardFooter>
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-background shadow-lg transform transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } z-100 border-l`}
      >
        {selectedRecord && (
          <div className="flex flex-col h-full p-2">
            <div className="p-4 flex flex-row justify-between items-start">
              <div className="flex flex-col">
                <h2 className="font-semibold">Record Details</h2>
                <p className="text-sm text-muted-foreground pt-1">Here's all you need to know about your patient's record</p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeSidebar}>
                <X />
              </Button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold mb-2">File Name</Label>
                  <p className="text-sm">{selectedRecord.filename}</p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Record Type</Label>
                  <p className="text-sm">{selectedRecord.type}</p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Doctor</Label>
                  <p className="text-sm">{selectedRecord.doctor}</p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Company</Label>
                  <p className="text-sm">{selectedRecord.company || 'N/A'}</p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Ordered Date</Label>
                  <p className="text-sm">{selectedRecord.ordered_date}</p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Received Date</Label>
                  <p className="text-sm">{selectedRecord.received_date}</p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Reported Date</Label>
                  <p className="text-sm">{selectedRecord.received_date}</p>
                </div>
              </div>
              <div className="col-span-2 my-4">
                <Separator className="border-t" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <Label className="font-semibold mb-2">Remarks</Label>
                  <p className="text-sm">{selectedRecord.remarks || 'N/A'}</p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Impressions</Label>
                  <p className="text-sm">{selectedRecord.impressions}</p>
                </div>
                <div>
                  <Label className="font-semibold mb-2">Recommendations</Label>
                  <p className="text-sm">{selectedRecord.recommendations || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleDelete(displayRecords.findIndex((r) => r.id === selectedRecord.id))}
              >
                <Trash2 />
                Delete File
              </Button>
              <Button
                className="w-full"
                onClick={() => handleDownload(selectedRecord.fileurl, selectedRecord.filename)}
                disabled={!selectedRecord.fileurl}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download File
              </Button>
            </div>
          </div>
        )}
      </div>
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/70 transition-opacity duration-300 ease-in-out"
            style={{
              opacity: isPreviewOpen ? 1 : 0,
              transition: 'opacity 300ms ease-in-out',
            }}
            onClick={() => setIsPreviewOpen(false)}
          />
          <div
            className="fixed left-0 top-0 h-full w-[calc(100%-24rem)] shadow-lg"
            style={{
              transform: isPreviewOpen ? 'translateX(0)' : 'translateX(-100%)',
              opacity: isPreviewOpen ? 1 : 0,
              transition: 'transform 300ms ease-in-out, opacity 250ms ease-in-out',
              background: 'transparent',
            }}
          >
            <div className="h-full w-full flex items-center justify-center p-4">
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-none opacity-0"
                  style={{
                    animation: 'fadeIn 400ms ease-in-out forwards 150ms',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                  }}
                  title="Attachment preview"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}