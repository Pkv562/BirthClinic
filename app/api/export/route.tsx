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
  console.log("Received POST request to /api/export");
  try {
    const data = await req.json();
    console.log("Request body:", data);

    if (!data.patient || !data.exportOptions) {
      console.error("Missing patient data or export options");
      return NextResponse.json({ error: "Missing patient data or export options" }, { status: 400 });
    }

    const { patient, exportOptions, allergies, supplements, labRecords, prescriptions, appointments } = data;
    const fullName = `${patient.first_name} ${patient.middle_name ? patient.middle_name + " " : ""}${patient.last_name}`;
    const ecFullName = patient.ec_first_name
      ? `${patient.ec_first_name} ${patient.ec_middle_name ? patient.ec_middle_name + " " : ""}${patient.ec_last_name}`
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
        csvRows.push(["Personal Info", "Date of Birth", patient.birth_date || "Not specified"]);
        csvRows.push(["Personal Info", "Age", patient.age || "Not specified"]);
        csvRows.push(["Personal Info", "Contact Number", patient.contact_number || "Not provided"]);
        csvRows.push(["Personal Info", "Address", patient.address || "Not provided"]);
        csvRows.push(["Personal Info", "Marital Status", patient.marital_status || "Not provided"]);
        csvRows.push(["Personal Info", "Citizenship", patient.citizenship || "Not specified"]);
        csvRows.push(["Personal Info", "Religion", patient.religion || "Not specified"]);
        csvRows.push(["Personal Info", "Occupation", patient.occupation || "Not specified"]);
        csvRows.push(["Personal Info", "SSN", patient.ssn || "Not provided"]);
        csvRows.push(["Personal Info", "Member Status", patient.member || "Not specified"]);
        csvRows.push(["Personal Info", "Status", patient.status || "Not specified"]);
        csvRows.push(["Personal Info", "Expected Date of Confinement", patient.expected_date_of_confinement || "Not specified"]);

        // Emergency Contact
        csvRows.push(["Emergency Contact", "Name", ecFullName]);
        csvRows.push(["Emergency Contact", "Relationship", patient.ec_relationship || "Not specified"]);
        csvRows.push(["Emergency Contact", "Contact Number", patient.ec_contact_number || "Not provided"]);
      }

      if (exportOptions.allergies && allergies.length > 0) {
        allergies.forEach((allergy: any, index: number) => {
          csvRows.push([`Allergy ${index + 1}`, "Name", allergy.name || "Not specified"]);
          csvRows.push([`Allergy ${index + 1}`, "Severity", allergy.severity || "Not specified"]);
        });
      }

      if (exportOptions.supplements && supplements.length > 0) {
        supplements.forEach((supplement: any, index: number) => {
          csvRows.push([`Supplement ${index + 1}`, "Name", supplement.name || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Strength", supplement.strength || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Amount", supplement.amount || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Frequency", supplement.frequency || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Clinician", supplement.clinician || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Status", supplement.status || "Not specified"]);
        });
      }

      if (exportOptions.prescriptions && prescriptions.length > 0) {
        prescriptions.forEach((prescription: any, index: number) => {
          csvRows.push([`Prescription ${index + 1}`, "Name", prescription.name || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Strength", prescription.strength || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Amount", prescription.amount || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Frequency", prescription.frequency || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Route", prescription.route || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Clinician", prescription.clinician || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Status", prescription.status || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Date", prescription.date ? new Date(prescription.date).toLocaleDateString() : "Not specified"]);
        });
      }

      if (exportOptions.appointments && appointments.length > 0) {
        appointments.forEach((appointment: any, index: number) => {
          csvRows.push([`Appointment ${index + 1}`, "Service", appointment.service || "Not specified"]);
          csvRows.push([`Appointment ${index + 1}`, "Date", appointment.date || "Not specified"]);
          csvRows.push([`Appointment ${index + 1}`, "Clinician", appointment.clinician || "Not specified"]);
          csvRows.push([`Appointment ${index + 1}`, "Status", appointment.status || "Not specified"]);
          csvRows.push([`Appointment ${index + 1}`, "Payment Status", appointment.payment_status || "Not specified"]);
        });
      }

      if (exportOptions.labRecords && labRecords.length > 0) {
        labRecords.forEach((record: any, index: number) => {
          csvRows.push([`Lab Record ${index + 1}`, "Type", record.type || "Not specified"]);
          csvRows.push([`Lab Record ${index + 1}`, "Doctor", record.doctor || "Not specified"]);
          csvRows.push([`Lab Record ${index + 1}`, "Company", record.company || "Not specified"]);
          csvRows.push([`Lab Record ${index + 1}`, "Ordered Date", record.ordered_date || "Not specified"]);
          csvRows.push([`Lab Record ${index + 1}`, "Received Date", record.received_date || "Not specified"]);
          csvRows.push([`Lab Record ${index + 1}`, "Reported Date", record.reported_date || "Not specified"]);
          csvRows.push([`Lab Record ${index + 1}`, "Impressions", record.impressions || "Not specified"]);
          csvRows.push([`Lab Record ${index + 1}`, "Remarks", record.remarks || "Not specified"]);
          csvRows.push([`Lab Record ${index + 1}`, "Recommendations", record.recommendations || "Not specified"]);
          csvRows.push([`Lab Record ${index + 1}`, "Notes", record.notes || "Not specified"]);
        });
      }

      const csvContent = csvRows.join("\n");
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="Patient_Report_${fullName}.csv"`,
        },
      });
    }

    // If not CSV, continue with PDF generation
    console.log("Generating PDF for patient:", fullName);

    // Create jsPDF document for patient report
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
    doc.text(`Patient Report: ${fullName}`, 105, y, { align: "center" });
    y += 20;
    doc.setFontSize(12);
    doc.text(new Date().toLocaleDateString(), 105, y, { align: "center" });
    y += 20;

    if (exportOptions.basicInfo) {
      console.log("Adding basic information to PDF...");
      // Patient Information with image beside
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255); // Light blue background for section title
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Patient Information", leftMargin, y);
      y += 20;

      // Add Patient Profile Image beside the section
      let imageX = leftMargin + tableWidth - 40; // Position image to the right
      if (patient.fileurl) {
        console.log("Fetching patient profile image...");
        const { data: profileData, mimeType: profileMimeType } = await getFileData(patient.fileurl, "profile-pictures");
        if (profileData && profileMimeType.startsWith("image/")) {
          const profileImageBase64 = await getImageAsBase64(profileData, profileMimeType);
          if (profileImageBase64) {
            try {
              checkPageBreak(50); // Reserve space for image
              doc.addImage(profileImageBase64, profileMimeType.includes("png") ? "PNG" : "JPEG", imageX, y - 40, 40, 40); // 40x40 mm image
            } catch (error) {
              console.error("Error adding profile image to PDF:", error);
            }
          } else {
            console.warn("Failed to convert profile image to base64:", patient.fileurl);
            checkPageBreak(10);
            doc.text("[Profile image not available]", imageX, y);
            y += 10;
          }
        } else {
          console.warn("Profile file is not an image or unavailable:", patient.fileurl);
          checkPageBreak(10);
          doc.text("[Profile image not available]", imageX, y);
          y += 10;
        }
      }

      doc.setFontSize(12);
      const personalInfo = [
        ["Full Name", fullName],
        ["Date of Birth", patient.birth_date || "Not specified"],
        ["Age", patient.age || "Not specified"],
        ["Contact Number", patient.contact_number || "Not provided"],
        ["Address", patient.address || "Not provided"],
        ["Marital Status", patient.marital_status || "Not provided"],
        ["Citizenship", patient.citizenship || "Not specified"],
        ["Religion", patient.religion || "Not specified"],
        ["Occupation", patient.occupation || "Not specified"],
        ["SSN", patient.ssn || "Not provided"],
        ["Member Status", patient.member || "Not specified"],
        ["Status", patient.status || "Not specified"],
        ["Expected Date of Confinement", patient.expected_date_of_confinement || "Not specified"],
      ];
      personalInfo.forEach((row) => {
        checkPageBreak(10);
        doc.text(`${row[0]}:`, leftMargin, y);
        doc.text(row[1], leftMargin + 50, y);
        y += 10;
      });
      y += 50;

      // Emergency Contact
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255); // Light blue background for section title
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Emergency Contact", leftMargin, y);
      y += 20;
      doc.setFontSize(12);
      const ecInfo = [
        ["Name", ecFullName],
        ["Relationship", patient.ec_relationship || "Not specified"],
        ["Contact Number", patient.ec_contact_number || "Not provided"],
      ];
      ecInfo.forEach((row) => {
        checkPageBreak(10);
        doc.text(`${row[0]}:`, leftMargin, y);
        doc.text(row[1], leftMargin + 50, y);
        y += 10;
      });
      y += 20;
    }

    if (exportOptions.allergies && allergies.length > 0) {
      console.log("Adding allergies to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255); // Light blue background for section title
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Allergies", leftMargin, y);
      y += 20;
      doc.setFontSize(12);
      allergies.forEach((allergy: any, index: number) => {
        checkPageBreak(10);
        doc.text(`Allergy ${index + 1}: ${allergy.name || "N/A"} (Severity: ${allergy.severity || "N/A"})`, leftMargin, y);
        y += 10;
      });
      y += 20;
    }

    if (exportOptions.supplements && supplements.length > 0) {
      console.log("Adding supplements to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255); // Light blue background for section title
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Supplements", leftMargin, y);
      y += 20;
      doc.setFontSize(12);
      supplements.forEach((supp: any, index: number) => {
        checkPageBreak(15);
        doc.text(
          `Supplement ${index + 1}: ${supp.name || "N/A"} (Strength: ${supp.strength || "N/A"}, Amount: ${supp.amount || "N/A"}, Frequency: ${supp.frequency || "N/A"}, Clinician: ${supp.clinician || "N/A"}, Status: ${supp.status || "N/A"})`,
          leftMargin,
          y,
          { maxWidth: tableWidth }
        );
        y += 15;
      });
      y += 20;
    }

    if (exportOptions.prescriptions && prescriptions.length > 0) {
      console.log("Adding prescriptions to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255); // Light blue background for section title
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Prescriptions", leftMargin, y);
      y += 20;
      doc.setFontSize(12);
      prescriptions.forEach((pres: any, index: number) => {
        checkPageBreak(15);
        doc.text(
          `Prescription ${index + 1}: ${pres.name || "N/A"} (Strength: ${pres.strength || "N/A"}, Amount: ${pres.amount || "N/A"}, Frequency: ${pres.frequency || "N/A"}, Route: ${pres.route || "N/A"}, Clinician: ${pres.clinician || "N/A"}, Status: ${pres.status || "N/A"}, Issued: ${pres.date ? new Date(pres.date).toLocaleDateString() : "N/A"})`,
          leftMargin,
          y,
          { maxWidth: tableWidth }
        );
        y += 15;
      });
      y += 20;
    }

    if (exportOptions.appointments && appointments.length > 0) {
      console.log("Adding appointments to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255); // Light blue background for section title
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Appointments", leftMargin, y);
      y += 20;
      doc.setFontSize(12);
      appointments.forEach((app: any, index: number) => {
        checkPageBreak(15);
        doc.text(
          `Appointment ${index + 1}: ${app.service || "N/A"} (Date: ${app.date || "N/A"}, Clinician: ${app.clinician || "N/A"}, Status: ${app.status || "N/A"}, Payment Status: ${app.payment_status || "N/A"})`,
          leftMargin,
          y,
          { maxWidth: tableWidth }
        );
        y += 15;
      });
      y += 20;
    }

    let pdfLabRecords: { data: Buffer; filename: string }[] = [];
    if (exportOptions.labRecords && labRecords.length > 0) {
      console.log("Adding lab records to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255); // Light blue background for section title
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Laboratory Records", leftMargin, y);
      y += 20;
      doc.setFontSize(12);
      for (const [index, record] of labRecords.entries()) {
        checkPageBreak(10);
        doc.text(`${record.filename || "N/A"} (${record.type || "N/A"})`, leftMargin, y);
        y += 10;
        const labInfo = [
          `Doctor: ${record.doctor || "N/A"}`,
          `Company: ${record.company || "N/A"}`,
          `Ordered Date: ${record.ordered_date || "N/A"}`,
          `Received Date: ${record.received_date || "N/A"}`,
          `Reported Date: ${record.reported_date || "N/A"}`,
          `Impressions: ${record.impressions || "N/A"}`,
          `Remarks: ${record.remarks || "N/A"}`,
          `Recommendations: ${record.recommendations || "N/A"}`,
          `Notes: ${record.notes || "N/A"}`,
        ];
        labInfo.forEach((line) => {
          checkPageBreak(10);
          doc.text(`- ${line}`, leftMargin + 10, y, { maxWidth: tableWidth - 10 });
          y += 10;
        });

        // Handle Lab Record File
        if (record.fileurl) {
          console.log(`Fetching lab record file ${index + 1}...`);
          const { data: labFileData, mimeType } = await getFileData(record.fileurl, "laboratory-files");
          if (labFileData && mimeType.startsWith("image/")) {
            const labImageBase64 = await getImageAsBase64(labFileData, mimeType);
            if (labImageBase64) {
              try {
                checkPageBreak(60); // Reserve space for image
                doc.addImage(labImageBase64, mimeType.includes("png") ? "PNG" : "JPEG", leftMargin, y, 170, 50); // 170x50 mm image
                y += 60;
              } catch (error) {
                console.error(`Error adding lab record image ${index + 1} to PDF:`, error);
                checkPageBreak(10);
                doc.text(`[Image not available]`, leftMargin, y);
                y += 10;
              }
            } else {
              console.warn(`Failed to convert lab record image ${index + 1}: ${record.fileurl}`);
              checkPageBreak(10);
              doc.text(`[Image not available]`, leftMargin, y);
              y += 10;
            }
          } else if (labFileData && mimeType === "application/pdf") {
            console.log(`Lab record ${index + 1} is a PDF: ${record.fileurl}`);
            checkPageBreak(10);
            doc.text(`[PDF lab record appended at the end]`, leftMargin, y);
            y += 10;
            pdfLabRecords.push({ data: labFileData, filename: record.filename });
          } else {
            console.warn(`Failed to load lab record file ${index + 1} or unsupported file type: ${record.fileurl}`);
            checkPageBreak(10);
            doc.text(`[File not available]`, leftMargin, y);
            y += 10;
          }
        }
        y += 10;
      }
      y += 20;
    }

    // Convert jsPDF document to Buffer
    const patientReportBuffer = Buffer.from(doc.output("arraybuffer"));

    // Merge PDFs using pdf-lib
    const mergedPdf = await PDFDocument.create();
    const patientReportPdf = await PDFDocument.load(patientReportBuffer);
    const patientReportPages = await mergedPdf.copyPages(patientReportPdf, patientReportPdf.getPageIndices());
    patientReportPages.forEach((page) => mergedPdf.addPage(page));

    // Append lab record PDFs
    for (const { data, filename } of pdfLabRecords) {
      try {
        console.log(`Appending PDF lab record: ${filename}`);
        const labRecordPdf = await PDFDocument.load(data);
        const labRecordPages = await mergedPdf.copyPages(labRecordPdf, labRecordPdf.getPageIndices());
        labRecordPages.forEach((page) => mergedPdf.addPage(page));
      } catch (error) {
        console.error(`Error appending lab record PDF ${filename}:`, error);
      }
    }

    // Save the merged PDF
    console.log("Generating merged PDF buffer...");
    const mergedPdfBuffer = await mergedPdf.save();
    console.log("Merged PDF buffer generated successfully.");

    return new NextResponse(mergedPdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Patient_Report_${fullName}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    const errorMessage = error.message || "An unexpected error occurred while generating the PDF.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}