import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

export async function generatePDFReport(
  title: string,
  headers: string[],
  data: string[][]
): Promise<ArrayBuffer> {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

  // Table
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 36,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [255, 122, 26], // #FF7A1A
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [255, 242, 233], // #FFF2E9
    },
  });

  return doc.output('arraybuffer');
}

export async function generateExcelReport(
  title: string,
  headers: string[],
  data: string[][]
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LMS Platform';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(title);

  // Title row
  worksheet.mergeCells(1, 1, 1, headers.length);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // Date row
  worksheet.mergeCells(2, 1, 2, headers.length);
  const dateCell = worksheet.getCell('A2');
  dateCell.value = `Generated: ${new Date().toLocaleDateString()}`;
  dateCell.font = { size: 10, italic: true };
  dateCell.alignment = { horizontal: 'center' };

  // Empty row
  worksheet.addRow([]);

  // Header row
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF7A1A' },
    };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Data rows
  for (const row of data) {
    const dataRow = worksheet.addRow(row);
    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value ? String(cell.value) : '';
      maxLength = Math.max(maxLength, cellValue.length + 2);
    });
    column.width = Math.min(maxLength, 40);
  });

  const excelBuffer = await workbook.xlsx.writeBuffer();
  // writeBuffer returns ArrayBuffer in browser context
  if (excelBuffer instanceof ArrayBuffer) {
    return excelBuffer;
  }
  // Node.js Buffer — convert to ArrayBuffer
  const nodeBuffer = excelBuffer as Buffer;
  return nodeBuffer.buffer.slice(
    nodeBuffer.byteOffset,
    nodeBuffer.byteOffset + nodeBuffer.byteLength
  ) as ArrayBuffer;
}
