import { Router, type Response } from "express";

import { validate } from "../../../shared/validation/validate.ts";
import type {
  GenerateInventoryReport,
  GenerateMovementsReport,
  GenerateSalesReport,
} from "../application/use-cases/generate-reports.use-case.ts";
import type { GetSalesSummary } from "../application/use-cases/get-sales-summary.use-case.ts";
import { toBogotaClock } from "../domain/report-period.ts";
import type { RenderedReport } from "../domain/report.model.ts";
import { reportPeriodSchema } from "./reports.schemas.ts";

export type ReportsUseCases = {
  generateInventoryReport: GenerateInventoryReport;
  generateMovementsReport: GenerateMovementsReport;
  generateSalesReport: GenerateSalesReport;
  getSalesSummary: GetSalesSummary;
};

const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const sendReport = (res: Response, { filename, content }: RenderedReport) => {
  res
    .status(200)
    .type(XLSX_TYPE)
    .attachment(filename)
    .send(content);
};

export const reportsRouter = ({
  generateInventoryReport,
  generateMovementsReport,
  generateSalesReport,
  getSalesSummary,
}: ReportsUseCases): Router => {
  const router = Router();

  router.get("/summary", async (_req, res) => {
    const { businessId } = res.locals.auth;
    res.status(200).json(await getSalesSummary.execute(businessId));
  });

  router.get("/inventory", async (_req, res) => {
    const { businessId } = res.locals.auth;
    const today = toBogotaClock(new Date()).toISOString().slice(0, 10);
    sendReport(res, await generateInventoryReport.execute({ businessId, today }));
  });

  router.get("/movements", async (req, res) => {
    const period = validate(reportPeriodSchema, req.query);
    const { businessId } = res.locals.auth;
    sendReport(res, await generateMovementsReport.execute({ businessId, ...period }));
  });

  router.get("/sales", async (req, res) => {
    const period = validate(reportPeriodSchema, req.query);
    const { businessId } = res.locals.auth;
    sendReport(res, await generateSalesReport.execute({ businessId, ...period }));
  });

  return router;
};
