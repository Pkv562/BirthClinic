import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  console.log("Received POST request to /api/dashboard-export");
  try {
    const data = await req.json();
    console.log("Request body:", data);

    if (!data.exportOptions) {
      console.error("Missing export options");
      return NextResponse.json({ error: "Missing export options" }, { status: 400 });
    }

    const { exportOptions, exportFormat } = data;

    // Check if CSV format is requested
    if (exportFormat === "csv") {
      console.log("Generating CSV export...");
      const csvRows = [];
      
      // Add headers
      const headers = ["Category", "Metric", "Value"];
      csvRows.push(headers.join(","));

      if (exportOptions.overview) {
        csvRows.push(["Overview", "Active Patients", data.activePatients]);
        csvRows.push(["Overview", "Active Clinicians", data.activeClinicians]);
        csvRows.push(["Overview", "Total Appointments", data.totalAppointments]);
      }

      if (exportOptions.ageDistribution && data.chartData) {
        data.chartData.forEach((item: any) => {
          csvRows.push(["Age Distribution", `Age ${item.age}`, item.numberOfPatients]);
        });
      }

      if (exportOptions.clinicianDistribution && data.clinicianData) {
        data.clinicianData.forEach((item: any) => {
          csvRows.push(["Clinician Distribution", item.clinicianName, item.numberOfPatients]);
        });
      }

      if (exportOptions.appointments && data.appointments) {
        data.appointments.forEach((appointment: any, index: number) => {
          csvRows.push([
            "Today's Appointments",
            `Appointment ${index + 1} Patient`,
            appointment.patient_name
          ]);
          csvRows.push([
            "Today's Appointments",
            `Appointment ${index + 1} Clinician`,
            appointment.clinician_name
          ]);
          csvRows.push([
            "Today's Appointments",
            `Appointment ${index + 1} Date`,
            appointment.date
          ]);
          csvRows.push([
            "Today's Appointments",
            `Appointment ${index + 1} Service`,
            appointment.service
          ]);
          csvRows.push([
            "Today's Appointments",
            `Appointment ${index + 1} Status`,
            appointment.status
          ]);
          csvRows.push([
            "Today's Appointments",
            `Appointment ${index + 1} Payment Status`,
            appointment.payment_status
          ]);
        });
      }

      const csvContent = csvRows.join("\n");
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="Dashboard_Report_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // If not CSV, generate PDF
    console.log("Generating PDF...");
    const doc = new jsPDF();
    doc.setFont("helvetica");
    let y = 20;
    const pageHeight = 260;
    const topMargin = 20;
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
    doc.setFillColor(200, 220, 255);
    doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
    doc.text("Dashboard Report", 105, y, { align: "center" });
    y += 20;
    doc.setFontSize(12);
    doc.text(new Date().toLocaleDateString(), 105, y, { align: "center" });
    y += 20;

    if (exportOptions.overview) {
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Overview", leftMargin, y);
      y += 20;
      doc.setFontSize(12);

      const overviewData = [
        ["Active Patients", data.activePatients.toString()],
        ["Active Clinicians", data.activeClinicians.toString()],
        ["Total Appointments", data.totalAppointments.toString()],
      ];

      overviewData.forEach((row) => {
        checkPageBreak(10);
        doc.text(`${row[0]}:`, leftMargin, y);
        doc.text(row[1], leftMargin + 50, y);
        y += 10;
      });
      y += 10;
    }

    if (exportOptions.ageDistribution && data.chartData) {
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Age Distribution", leftMargin, y);
      y += 20;
      doc.setFontSize(12);

      data.chartData.forEach((item: any) => {
        checkPageBreak(10);
        doc.text(`Age ${item.age}:`, leftMargin, y);
        doc.text(item.numberOfPatients.toString(), leftMargin + 50, y);
        y += 10;
      });
      y += 10;
    }

    if (exportOptions.clinicianDistribution && data.clinicianData) {
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Clinician Distribution", leftMargin, y);
      y += 20;
      doc.setFontSize(12);

      data.clinicianData.forEach((item: any) => {
        checkPageBreak(10);
        doc.text(item.clinicianName + ":", leftMargin, y);
        doc.text(item.numberOfPatients.toString() + " patients", leftMargin + 50, y);
        y += 10;
      });
      y += 10;
    }

    if (exportOptions.appointments && data.appointments) {
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Today's Appointments", leftMargin, y);
      y += 20;
      doc.setFontSize(12);

      data.appointments.forEach((appointment: any, index: number) => {
        checkPageBreak(40);
        doc.text(`Appointment ${index + 1}:`, leftMargin, y);
        y += 10;
        doc.text(`Patient: ${appointment.patient_name}`, leftMargin + 10, y);
        y += 10;
        doc.text(`Clinician: ${appointment.clinician_name}`, leftMargin + 10, y);
        y += 10;
        doc.text(`Service: ${appointment.service}`, leftMargin + 10, y);
        y += 10;
        doc.text(`Status: ${appointment.status}`, leftMargin + 10, y);
        y += 10;
        doc.text(`Payment Status: ${appointment.payment_status}`, leftMargin + 10, y);
        y += 15;
      });
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Dashboard_Report_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("Error generating export:", error);
    const errorMessage = error.message || "An unexpected error occurred while generating the export.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 