import type { RenderedReport, ReportFile } from "../../domain/report.model.ts";

export interface ReportRenderer {
  render(report: ReportFile): Promise<RenderedReport>;
}
