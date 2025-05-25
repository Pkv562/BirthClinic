import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";

export async function POST(req: NextRequest) {
  console.log("Received POST request to /api/export/appointment");
  try {
    const data = await req.json();
    console.log("Received export request with data:", JSON.stringify(data, null, 2));

    if (!data.appointment || !data.exportOptions) {
      console.error("Missing appointment data or export options");
      return NextResponse.json({ error: "Missing appointment data or export options" }, { status: 400 });
    }

    const { appointment, exportOptions, exportFormat } = data;
    console.log("Processing appointment:", appointment.id);
    console.log("Export options:", exportOptions);
    console.log("Prescriptions data:", appointment.prescriptions);
    console.log("Supplements data:", appointment.supplements);

    const patientName = appointment.patient ? 
      `${appointment.patient.person.first_name} ${appointment.patient.person.middle_name ? appointment.patient.person.middle_name + " " : ""}${appointment.patient.person.last_name}` : 
      "Unknown Patient";
    const clinicianName = appointment.clinician ? 
      `${appointment.clinician.person.first_name} ${appointment.clinician.person.middle_name ? appointment.clinician.person.middle_name + " " : ""}${appointment.clinician.person.last_name}` : 
      "Unknown Clinician";

    // Check if CSV format is requested
    if (data.exportFormat === "csv") {
      console.log("Generating CSV export...");
      const csvRows = [];
      
      // Add headers
      const headers = ["Category", "Field", "Value"];
      csvRows.push(headers.join(","));

      if (exportOptions.appointmentInfo) {
        csvRows.push(["Appointment", "Date", new Date(appointment.date).toLocaleDateString()]);
        csvRows.push(["Appointment", "Service", appointment.service || "Not specified"]);
        csvRows.push(["Appointment", "Status", appointment.status || "Not specified"]);
        csvRows.push(["Appointment", "Payment Status", appointment.payment_status || "Not specified"]);
        csvRows.push(["Appointment", "Weight", appointment.weight ? `${appointment.weight} kg` : "Not recorded"]);
        csvRows.push(["Appointment", "Gestational Age", appointment.gestational_age ? `${appointment.gestational_age} weeks` : "Not recorded"]);
      }

      if (exportOptions.patientInfo && appointment.patient) {
        csvRows.push(["Patient", "Name", patientName]);
        csvRows.push(["Patient", "Birth Date", appointment.patient.person.birth_date || "Not specified"]);
        csvRows.push(["Patient", "Age", appointment.patient.person.age || "Not specified"]);
        csvRows.push(["Patient", "Contact Number", appointment.patient.person.contact_number || "Not provided"]);
        csvRows.push(["Patient", "Address", appointment.patient.person.address || "Not provided"]);
      }

      if (exportOptions.clinicianInfo && appointment.clinician) {
        csvRows.push(["Clinician", "Name", clinicianName]);
        csvRows.push(["Clinician", "Role", appointment.clinician.role || "Not specified"]);
        csvRows.push(["Clinician", "Specialization", appointment.clinician.specialization || "Not specified"]);
      }

      if (exportOptions.vitals && appointment.vitals) {
        csvRows.push(["Vitals", "Weight", appointment.weight ? `${appointment.weight} kg` : "Not recorded"]);
        csvRows.push(["Vitals", "Gestational Age", appointment.gestational_age ? `${appointment.gestational_age} weeks` : "Not recorded"]);
        csvRows.push(["Vitals", "Temperature", appointment.vitals.temperature ? `${appointment.vitals.temperature} °C` : "Not recorded"]);
        csvRows.push(["Vitals", "Pulse Rate", appointment.vitals.pulse_rate ? `${appointment.vitals.pulse_rate} bpm` : "Not recorded"]);
        csvRows.push(["Vitals", "Blood Pressure", appointment.vitals.blood_pressure || "Not recorded"]);
        csvRows.push(["Vitals", "Respiration Rate", appointment.vitals.respiration_rate ? `${appointment.vitals.respiration_rate} breaths/min` : "Not recorded"]);
        csvRows.push(["Vitals", "Oxygen Saturation", appointment.vitals.oxygen_saturation ? `${appointment.vitals.oxygen_saturation}%` : "Not recorded"]);
      }

      if (exportOptions.prescriptions && appointment.prescriptions) {
        appointment.prescriptions.forEach((prescription: any, index: number) => {
          csvRows.push([`Prescription ${index + 1}`, "Medicine", prescription.medicine || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Dosage", prescription.dosage || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Frequency", prescription.frequency || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Duration", prescription.duration || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Instructions", prescription.instructions || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Status", prescription.status || "Not specified"]);
          csvRows.push([`Prescription ${index + 1}`, "Date Prescribed", prescription.date ? new Date(prescription.date).toLocaleDateString() : "Not specified"]);
        });
      }

      if (exportOptions.supplements && appointment.supplements) {
        appointment.supplements.forEach((supplement: any, index: number) => {
          csvRows.push([`Supplement ${index + 1}`, "Name", supplement.name || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Strength", supplement.strength || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Amount", supplement.amount || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Frequency", supplement.frequency || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Route", supplement.route || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Status", supplement.status || "Not specified"]);
          csvRows.push([`Supplement ${index + 1}`, "Date Recommended", supplement.date ? new Date(supplement.date).toLocaleDateString() : "Not specified"]);
        });
      }

      const csvContent = csvRows.join("\n");
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="Appointment_Report_${patientName}_${new Date(appointment.date).toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // If not CSV, continue with PDF generation
    console.log("Generating PDF for appointment with patient:", patientName);

    // Create jsPDF document for appointment report
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
    doc.text(`Appointment Report`, 105, y, { align: "center" });
    y += 20;
    doc.setFontSize(12);
    doc.text(new Date().toLocaleDateString(), 105, y, { align: "center" });
    y += 20;

    if (exportOptions.appointmentInfo) {
      console.log("Adding appointment information to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Appointment Information", leftMargin, y);
      y += 20;

      doc.setFontSize(12);
      const appointmentInfo = [
        ["Date", new Date(appointment.date).toLocaleDateString()],
        ["Service", appointment.service || "Not specified"],
        ["Status", appointment.status || "Not specified"],
        ["Payment Status", appointment.payment_status || "Not specified"],
        ["Weight", appointment.weight ? `${appointment.weight} kg` : "Not recorded"],
        ["Gestational Age", appointment.gestational_age ? `${appointment.gestational_age} weeks` : "Not recorded"],
      ];

      appointmentInfo.forEach((row) => {
        checkPageBreak(10);
        doc.text(`${row[0]}:`, leftMargin, y);
        doc.text(row[1], leftMargin + 50, y);
        y += 10;
      });
      y += 20;
    }

    if (exportOptions.patientInfo && appointment.patient) {
      console.log("Adding patient information to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Patient Information", leftMargin, y);
      y += 20;

      doc.setFontSize(12);
      const patientInfo = [
        ["Name", patientName],
        ["Birth Date", appointment.patient.person.birth_date || "Not specified"],
        ["Age", appointment.patient.person.age || "Not specified"],
        ["Contact Number", appointment.patient.person.contact_number || "Not provided"],
        ["Address", appointment.patient.person.address || "Not provided"],
      ];

      patientInfo.forEach((row) => {
        checkPageBreak(10);
        doc.text(`${row[0]}:`, leftMargin, y);
        doc.text(row[1], leftMargin + 50, y);
        y += 10;
      });
      y += 20;
    }

    if (exportOptions.clinicianInfo && appointment.clinician) {
      console.log("Adding clinician information to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Clinician Information", leftMargin, y);
      y += 20;

      doc.setFontSize(12);
      const clinicianInfo = [
        ["Name", clinicianName],
        ["Role", appointment.clinician.role || "Not specified"],
        ["Specialization", appointment.clinician.specialization || "Not specified"],
      ];

      clinicianInfo.forEach((row) => {
        checkPageBreak(10);
        doc.text(`${row[0]}:`, leftMargin, y);
        doc.text(row[1], leftMargin + 50, y);
        y += 10;
      });
      y += 20;
    }

    if (exportOptions.vitals && appointment.vitals) {
      console.log("Adding vitals to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Vitals", leftMargin, y);
      y += 20;

      doc.setFontSize(12);
      const vitalsInfo = [
        ["Weight", appointment.weight ? `${appointment.weight} kg` : "Not recorded"],
        ["Gestational Age", appointment.gestational_age ? `${appointment.gestational_age} weeks` : "Not recorded"],
        ["Temperature", appointment.vitals.temperature ? `${appointment.vitals.temperature} °C` : "Not recorded"],
        ["Pulse Rate", appointment.vitals.pulse_rate ? `${appointment.vitals.pulse_rate} bpm` : "Not recorded"],
        ["Blood Pressure", appointment.vitals.blood_pressure || "Not recorded"],
        ["Respiration Rate", appointment.vitals.respiration_rate ? `${appointment.vitals.respiration_rate} breaths/min` : "Not recorded"],
        ["Oxygen Saturation", appointment.vitals.oxygen_saturation ? `${appointment.vitals.oxygen_saturation}%` : "Not recorded"],
      ];

      vitalsInfo.forEach((row) => {
        checkPageBreak(10);
        doc.text(`${row[0]}:`, leftMargin, y);
        doc.text(row[1], leftMargin + 50, y);
        y += 10;
      });
      y += 20;
    }

    if (exportOptions.prescriptions) {
      console.log("Adding prescriptions to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Prescriptions", leftMargin, y);
      y += 20;

      doc.setFontSize(12);
      if (appointment.prescriptions && appointment.prescriptions.length > 0) {
        appointment.prescriptions.forEach((prescription: any) => {
          checkPageBreak(40); // Ensure enough space for each prescription
          const prescriptionInfo = [
            ["Name", prescription.name || "Not specified"],
            ["Strength", prescription.strength || "Not specified"],
            ["Amount", prescription.amount || "Not specified"],
            ["Frequency", prescription.frequency || "Not specified"],
            ["Route", prescription.route || "Not specified"],
            ["Status", prescription.status || "Not specified"],
            ["Date", prescription.date ? new Date(prescription.date).toLocaleDateString() : "Not specified"],
            ["Appointment", prescription.appointment_id ? `ID: ${prescription.appointment_id}` : "Not linked to appointment"]
          ];

          prescriptionInfo.forEach((row) => {
            checkPageBreak(10);
            doc.text(`${row[0]}:`, leftMargin, y);
            doc.text(row[1], leftMargin + 50, y);
            y += 10;
          });
          y += 10; // Add space between prescriptions
        });
      } else {
        doc.text("No prescriptions recorded", leftMargin, y);
        y += 20;
      }
    }

    if (exportOptions.supplements) {
      console.log("Adding supplements to PDF...");
      doc.setFontSize(16);
      checkPageBreak(20);
      doc.setFillColor(220, 235, 255);
      doc.rect(leftMargin, y - 10, tableWidth, 20, "F");
      doc.text("Supplements", leftMargin, y);
      y += 20;

      doc.setFontSize(12);
      if (appointment.supplements && appointment.supplements.length > 0) {
        appointment.supplements.forEach((supplement: any) => {
          checkPageBreak(40); // Ensure enough space for each supplement
          const supplementInfo = [
            ["Name", supplement.name || "Not specified"],
            ["Strength", supplement.strength || "Not specified"],
            ["Amount", supplement.amount || "Not specified"],
            ["Frequency", supplement.frequency || "Not specified"],
            ["Route", supplement.route || "Not specified"],
            ["Status", supplement.status || "Not specified"],
            ["Date", supplement.date ? new Date(supplement.date).toLocaleDateString() : "Not specified"],
            ["Appointment", supplement.appointment_id ? `ID: ${supplement.appointment_id}` : "Not linked to appointment"]
          ];

          supplementInfo.forEach((row) => {
            checkPageBreak(10);
            doc.text(`${row[0]}:`, leftMargin, y);
            doc.text(row[1], leftMargin + 50, y);
            y += 10;
          });
          y += 10; // Add space between supplements
        });
      } else {
        doc.text("No supplements recorded", leftMargin, y);
        y += 20;
      }
    }

    // Generate PDF buffer
    console.log("Generating PDF buffer...");
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    console.log("PDF buffer generated successfully.");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Appointment_Report_${patientName}_${new Date(appointment.date).toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    const errorMessage = error.message || "An unexpected error occurred while generating the PDF.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 