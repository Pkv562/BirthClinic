import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function getFileData(url: string, bucket: string): Promise<{ data: Buffer | null; mimeType: string }> {
  try {
    const filePath = url.split(`${bucket}/`)[1] || url;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error(`Error generating signed URL for ${bucket}:`, error);
      return { data: null, mimeType: "" };
    }

    const response = await fetch(data.signedUrl);
    if (!response.ok) {
      console.error(`Failed to fetch file from ${data.signedUrl}: ${response.status}`);
      return { data: null, mimeType: "" };
    }

    const mimeType = response.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return { data: buffer, mimeType };
  } catch (error) {
    console.error(`Error processing file from ${url}:`, error);
    return { data: null, mimeType: "" };
  }
}

async function getImageAsBase64(buffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    if (!mimeType.startsWith("image/")) {
      return null;
    }
    const base64 = buffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  console.log("Received POST request to /api/export/clinician");
  try {
    const data = await req.json();
    console.log("Request body:", data);

    if (!data.clinician || !data.exportOptions) {
      console.error("Missing clinician data or export options");
      return NextResponse.json({ error: "Missing clinician data or export options" }, { status: 400 });
    }

    const { clinician, exportOptions, supplements = [], prescriptions = [], appointments = [] } = data;
    const fullName = `${clinician.first_name} ${clinician.middle_name ? clinician.middle_name + " " : ""}${clinician.last_name}`;
    const ecFullName = clinician.ec_first_name
      ? `${clinician.ec_first_name} ${clinician.ec_middle_name ? clinician.ec_middle_name + " " : ""}${clinician.ec_last_name}`
      : "Not provided";

    // Check if CSV format is requested
    if (data.exportFormat === "csv") {
      console.log("Generating CSV export...");
      const csvRows = [];
      
      // Add headers
      const headers = ["Category", "Field", "Value"];
      csvRows.push(headers.join(","));

      if (exportOptions.basicInfo) {
        csvRows.push(["Personal Info", "Full Name", fullName]);
        csvRows.push(["Personal Info", "Role", clinician.role || "Not specified"]);
        csvRows.push(["Personal Info", "License Number", clinician.license_number || "Not specified"]);
        csvRows.push(["Personal Info", "Specialization", clinician.specialization || "Not specified"]);
        csvRows.push(["Personal Info", "Date of Birth", clinician.birth_date || "Not specified"]);
        csvRows.push(["Personal Info", "Age", clinician.age || "Not specified"]);
        csvRows.push(["Personal Info", "Contact Number", clinician.contact_number || "Not provided"]);
        csvRows.push(["Personal Info", "Address", clinician.address || "Not provided"]);
        csvRows.push(["Personal Info", "Marital Status", clinician.marital_status || "Not provided"]);
        csvRows.push(["Personal Info", "Citizenship", clinician.citizenship || "Not specified"]);
        csvRows.push(["Personal Info", "Religion", clinician.religion || "Not specified"]);
        csvRows.push(["Personal Info", "Status", clinician.status || "Not specified"]);

        // Emergency Contact
        csvRows.push(["Emergency Contact", "Name", ecFullName]);
        csvRows.push(["Emergency Contact", "Relationship", clinician.ec_relationship || "Not specified"]);
        csvRows.push(["Emergency Contact", "Contact Number", clinician.ec_contact_number || "Not provided"]);
      }

      if (exportOptions.supplements && Array.isArray(supplements) && supplements.length > 0) {
        supplements.forEach((supplement: any, index: number) => {
          if (!supplement) return;
          csvRows.push([`Supplement ${index + 1}`, "Name", supplement.name || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Strength", supplement.strength || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Amount", supplement.amount || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Frequency", supplement.frequency || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Patient", supplement.patient || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Status", supplement.status || "Not specified"]);
        });
      }

      if (exportOptions.prescriptions && Array.isArray(prescriptions) && prescriptions.length > 0 && clinician.role === "Doctor") {
        prescriptions.forEach((prescription: any, index: number) => {
          if (!prescription) return;
          csvRows.push([`Prescription ${index + 1}`, "Name", prescription.name || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Strength", prescription.strength || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Amount", prescription.amount || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Frequency", prescription.frequency || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Route", prescription.route || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Patient", prescription.patient || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Status", prescription.status || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Date", prescription.date ? new Date(prescription.date).toLocaleDateString() : "Not specified"]);
        });
      }

      if (exportOptions.appointments && Array.isArray(appointments) && appointments.length > 0) {
        appointments.forEach((appointment: any, index: number) => {
          if (!appointment) return;
          csvRows.push([`Appointment ${index + 1}`, "Service", appointment.service || "Not specified"]);
          csvRows.push([`Appointment ${index + 1}`, "Date", appointment.date || "Not specified"]);
          csvRows.push([`Appointment ${index + 1}`, "Patient", appointment.patient || "Not specified"]);
          csvRows.push([`Appointment ${index + 1}`, "Status", appointment.status || "Not specified"]);
          csvRows.push([`Appointment ${index + 1}`, "Payment Status", appointment.payment_status || "Not specified"]);
        });
      }

      const csvContent = csvRows.join("\n");
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="Clinician_Report_${fullName}.csv"`,
        },
      });
    }

    // If not CSV, continue with PDF generation
    console.log("Generating PDF for clinician:", fullName);

    // Create jsPDF document for clinician report
    const doc = new jsPDF();
    doc.setFont("helvetica");
    let y = 20;
    const pageHeight = 260;
    const topMargin = 20;
    const pageWidth = 210; // A4 width in mm
    const leftMargin = 20;
    const tableWidth = 170;

    const checkPageBreak = (requiredSpace: number) => {
      if (y + requiredSpace > pageHeight) {
        doc.addPage();
        y = topMargin;
      }
      return y;
    };

    // Header
    doc.setFontSize(20);
    checkPageBreak(30);
    doc.setFillColor(200, 220, 255); // Light blue background for header
    doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
    doc.text(`Clinician Report: ${fullName}`, 105, y, { align: "center" });
    y += 20;
    doc.setFontSize(12);
    doc.text(new Date().toLocaleDateString(), 105, y, { align: "center" });
    y += 20;

    if (exportOptions.basicInfo) {
      console.log("Adding basic information to PDF...");
      // Clinician Information with image beside
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255); // Light blue background for section title
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Clinician Information", leftMargin, y);
      y += 20;

      // Add Clinician Profile Image beside the section
      let imageX = leftMargin + tableWidth - 40; // Position image to the right
      if (clinician.fileurl) {
        console.log("Fetching clinician profile image...");
        const { data: profileData, mimeType: profileMimeType } = await getFileData(clinician.fileurl, "profile-pictures");
        if (profileData && profileMimeType.startsWith("image/")) {
          const profileImageBase64 = await getImageAsBase64(profileData, profileMimeType);
          if (profileImageBase64) {
            try {
              checkPageBreak(50); // Reserve space for image
              doc.addImage(profileImageBase64, profileMimeType.includes("png") ? "PNG" : "JPEG", imageX, y - 40, 40, 40); // 40x40 mm image
            } catch (error) {
              console.error("Error adding profile image to PDF:", error);
            }
          }
        }
      }

      doc.setFontSize(12);
      const personalInfo = [
        ["Full Name", fullName],
        ["Role", clinician.role || "Not specified"],
        ["License Number", clinician.license_number || "Not specified"],
        ["Specialization", clinician.specialization || "Not specified"],
        ["Date of Birth", clinician.birth_date || "Not specified"],
        ["Age", clinician.age || "Not specified"],
        ["Contact Number", clinician.contact_number || "Not provided"],
        ["Address", clinician.address || "Not provided"],
        ["Marital Status", clinician.marital_status || "Not provided"],
        ["Citizenship", clinician.citizenship || "Not specified"],
        ["Religion", clinician.religion || "Not specified"],
        ["Status", clinician.status || "Not specified"],
      ];
      personalInfo.forEach((row) => {
        checkPageBreak(10);
        doc.text(`${row[0]}:`, leftMargin, y);
        doc.text(row[1], leftMargin + 50, y);
        y += 10;
      });
      y += 20;

      // Emergency Contact
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Emergency Contact", leftMargin, y);
      y += 20;
      doc.setFontSize(12);
      const ecInfo = [
        ["Name", ecFullName],
        ["Relationship", clinician.ec_relationship || "Not specified"],
        ["Contact Number", clinician.ec_contact_number || "Not provided"],
      ];
      ecInfo.forEach((row) => {
        checkPageBreak(10);
        doc.text(`${row[0]}:`, leftMargin, y);
        doc.text(row[1], leftMargin + 50, y);
        y += 10;
      });
      y += 20;
    }

    if (exportOptions.supplements && Array.isArray(supplements) && supplements.length > 0) {
      console.log("Adding supplements to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Given Supplements", leftMargin, y);
      y += 20;
      doc.setFontSize(12);
      supplements.forEach((supp: any, index: number) => {
        if (!supp) return;
        checkPageBreak(15);
        const patientName = supp.patient || "N/A";
        doc.text(
          `Supplement ${index + 1}: ${supp.name || "N/A"} (Strength: ${supp.strength || "N/A"}, Amount: ${supp.amount || "N/A"}, Frequency: ${supp.frequency || "N/A"}, Patient: ${patientName}, Status: ${supp.status || "N/A"})`,
          leftMargin,
          y,
          { maxWidth: tableWidth }
        );
        y += 15;
      });
      y += 20;
    }

    if (exportOptions.prescriptions && Array.isArray(prescriptions) && prescriptions.length > 0 && clinician.role === "Doctor") {
      console.log("Adding prescriptions to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Given Prescriptions", leftMargin, y);
      y += 20;
      doc.setFontSize(12);
      prescriptions.forEach((pres: any, index: number) => {
        if (!pres) return;
        checkPageBreak(15);
        const patientName = pres.patient || "N/A";
        doc.text(
          `Prescription ${index + 1}: ${pres.name || "N/A"} (Strength: ${pres.strength || "N/A"}, Amount: ${pres.amount || "N/A"}, Frequency: ${pres.frequency || "N/A"}, Route: ${pres.route || "N/A"}, Patient: ${patientName}, Status: ${pres.status || "N/A"}, Issued: ${pres.date ? new Date(pres.date).toLocaleDateString() : "N/A"})`,
          leftMargin,
          y,
          { maxWidth: tableWidth }
        );
        y += 15;
      });
      y += 20;
    }

    if (exportOptions.appointments && Array.isArray(appointments) && appointments.length > 0) {
      console.log("Adding appointments to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Appointments", leftMargin, y);
      y += 20;
      doc.setFontSize(12);
      appointments.forEach((app: any, index: number) => {
        if (!app) return;
        checkPageBreak(15);
        const patientName = app.patient || "N/A";
        doc.text(
          `Appointment ${index + 1}: ${app.service || "N/A"} (Date: ${app.date || "N/A"}, Patient: ${patientName}, Status: ${app.status || "N/A"}, Payment Status: ${app.payment_status || "N/A"})`,
          leftMargin,
          y,
          { maxWidth: tableWidth }
        );
        y += 15;
      });
      y += 20;
    }

    // Convert jsPDF document to Buffer
    const clinicianReportBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(clinicianReportBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Clinician_Report_${fullName}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    const errorMessage = error.message || "An unexpected error occurred while generating the PDF.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 