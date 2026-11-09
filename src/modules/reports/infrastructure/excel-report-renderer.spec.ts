import ExcelJS from "exceljs";

import type { ReportFile } from "../domain/report.model.ts";
import { ExcelReportRenderer } from "./excel-report-renderer.ts";

const report: ReportFile = {
  filename: "ventas.xlsx",
  sheets: [
    {
      name: "Ventas",
      columns: [
        { header: "Producto", format: "text", width: 20 },
        { header: "Fecha", format: "date", width: 20 },
        { header: "Total", format: "money", width: 12 },
      ],
      rows: [
        ["Arroz", new Date("2026-11-11T10:30:00Z"), 5000],
        ["=1+1", null, null],
      ],
      totals: ["Total", null, 5000],
    },
    {
      name: "Otra hoja",
      columns: [{ header: "A", format: "quantity", width: 10 }],
      rows: [[2.5]],
    },
  ],
};

async function renderAndRead() {
  const { filename, content } = await new ExcelReportRenderer().render(report);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    content as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  return { filename, workbook };
}

describe("ExcelReportRenderer", () => {
  it("should write every sheet with its header, rows and totals", async () => {
    const { filename, workbook } = await renderAndRead();
    const sheet = workbook.getWorksheet("Ventas");

    expect(filename).toBe("ventas.xlsx");
    expect(workbook.worksheets.map(({ name }) => name)).toEqual(["Ventas", "Otra hoja"]);
    expect(sheet?.getRow(1).getCell(1).value).toBe("Producto");
    expect(sheet?.getRow(2).getCell(1).value).toBe("Arroz");
    expect(sheet?.getRow(2).getCell(3).value).toBe(5000);
    expect(sheet?.getRow(4).getCell(3).value).toBe(5000);
    expect(sheet?.getRow(4).font?.bold).toBe(true);
  });

  it("should keep dates as real dates with their format", async () => {
    const { workbook } = await renderAndRead();
    const cell = workbook.getWorksheet("Ventas")?.getRow(2).getCell(2);

    expect(cell?.value).toEqual(new Date("2026-11-11T10:30:00Z"));
    expect(cell?.numFmt).toBe("dd/mm/yyyy hh:mm AM/PM");
  });

  it("should not turn a product name into a formula", async () => {
    const { workbook } = await renderAndRead();
    const cell = workbook.getWorksheet("Ventas")?.getRow(3).getCell(1);

    expect(cell?.value).toBe("=1+1");
    expect(cell?.type).toBe(ExcelJS.ValueType.String);
  });

  it("should freeze the header", async () => {
    const { workbook } = await renderAndRead();

    expect(workbook.getWorksheet("Ventas")?.views[0]).toMatchObject({
      state: "frozen",
      ySplit: 1,
    });
  });
});
