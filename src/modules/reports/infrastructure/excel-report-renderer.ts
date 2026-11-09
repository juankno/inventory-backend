import ExcelJS from "exceljs";

import type { ReportRenderer } from "../application/ports/report-renderer.port.ts";
import type {
  RenderedReport,
  ReportColumn,
  ReportFile,
} from "../domain/report.model.ts";

// Colores del tema de la app.
const HEADER_FILL = "FF1F1F1E";
const HEADER_TEXT = "FFFFFFFF";
const TOTALS_FILL = "FFF1F0EC";

const NUMBER_FORMATS: Record<ReportColumn["format"], string | undefined> = {
  text: undefined,
  quantity: "#,##0.##",
  money: '"$"#,##0',
  date: "dd/mm/yyyy hh:mm AM/PM",
};

/**
 * Escribe el reporte en Excel. Los textos van siempre como texto: un nombre de
 * producto como "=1+1" no se interpreta como fórmula.
 */
export class ExcelReportRenderer implements ReportRenderer {
  async render({ filename, sheets }: ReportFile): Promise<RenderedReport> {
    const workbook = new ExcelJS.Workbook();

    for (const sheet of sheets) {
      const worksheet = workbook.addWorksheet(sheet.name, {
        views: [{ state: "frozen", ySplit: 1 }],
      });
      worksheet.columns = sheet.columns.map(({ header, width, format }) => ({
        header,
        width,
        style: { numFmt: NUMBER_FORMATS[format] },
      }));

      const header = worksheet.getRow(1);
      header.font = { bold: true, color: { argb: HEADER_TEXT } };
      header.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEADER_FILL },
      };

      worksheet.addRows(sheet.rows);

      if (sheet.totals) {
        const totals = worksheet.addRow(sheet.totals);
        totals.font = { bold: true };
        totals.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: TOTALS_FILL },
        };
      }
    }

    const content = await workbook.xlsx.writeBuffer();
    return { filename, content: Buffer.from(content) };
  }
}
