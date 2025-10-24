import Papa from 'papaparse';
import { RawNDFRow, NDFRecord } from '@/types/ndf';
import { ColumnMapping } from '@/types/columnMapping';

/**
 * Parse Brazilian number format (1.000.000,50 → 1000000.50)
 */
export function parseBrazilianNumber(value: string | number): number | null {
  if (typeof value === 'number') return value;
  if (!value || value === '-' || value.trim() === '') return null;
  
  const cleaned = value
    .replace(/\./g, '') // Remove thousands separator
    .replace(',', '.'); // Replace decimal comma with dot
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Determine tenor bucket from days to maturity
 */
export function getTenorBucket(dc: number | null): string {
  if (dc === null) return 'N/A';
  if (dc < 30) return '0-29D';
  if (dc < 60) return '30-59D';
  if (dc < 90) return '60-89D';
  if (dc < 120) return '90-119D';
  if (dc < 180) return '150-179D';
  if (dc < 210) return '180-209D';
  return '≥210D';
}

/**
 * Determine notional bucket
 */
export function getNotionalBucket(notional: number): string {
  if (notional < 100000) return '0-100k';
  if (notional < 500000) return '100k-500k';
  if (notional < 1000000) return '500k-1M';
  return '>1M';
}

/**
 * Calculate markup in basis points
 */
export function calculateMarkupBps(
  fwdClient: number | null,
  fwd: number | null,
  yieldClient: number | null,
  yieldCcy: number | null
): number | null {
  // Primary formula
  if (fwdClient !== null && fwd !== null && fwd !== 0) {
    return ((fwdClient - fwd) / fwd) * 10000;
  }
  
  // Fallback formula
  if (yieldClient !== null && yieldCcy !== null) {
    return (yieldClient - yieldCcy) * 10000;
  }
  
  return null;
}

/**
 * Calculate P&L in BRL
 */
export function calculatePLBrl(
  isBuy: boolean,
  fwdClient: number | null,
  fwd: number | null,
  notional: number,
  parity: string,
  spotFx: number | null
): number | null {
  if (fwdClient === null || fwd === null) return null;
  
  // Check if this is a BRL quote currency pair
  const isBrlPair = parity.toUpperCase().includes('BRL');
  
  let plInQuoteCurrency: number;
  
  if (isBuy) {
    plInQuoteCurrency = (fwdClient - fwd) * notional;
  } else {
    plInQuoteCurrency = (fwd - fwdClient) * notional;
  }
  
  // If not BRL pair, convert using spot FX (simplified)
  if (!isBrlPair && spotFx !== null && spotFx !== 0) {
    return plInQuoteCurrency * spotFx;
  }
  
  return plInQuoteCurrency;
}

/**
 * Normalize side to BUY/SELL boolean
 */
export function normalizeSide(side: string): boolean {
  const normalized = side.trim().toUpperCase();
  return normalized === 'COMPRA' || normalized === 'BUY';
}

/**
 * Parse a single row from CSV to NDFRecord (default column names)
 */
export function parseNDFRow(row: RawNDFRow): NDFRecord {
  const rfqTimestamp = new Date(row["RFQ Timestamp"]);
  const maturityDate = new Date(row["Maturity Date"]);
  const tenorDc = calculateTenorDays(rfqTimestamp, maturityDate);
  
  const notional = parseBrazilianNumber(row["Notional"]) || 0;
  const fwd = parseBrazilianNumber(row["FWD"]);
  const fwdClient = parseBrazilianNumber(row["FWD-Client"]);
  const yieldCcy = parseBrazilianNumber(row["Yield (CCY)"]);
  const yieldClient = parseBrazilianNumber(row["Yield (Client)"]);
  const isBuy = normalizeSide(row["Side"] || row["Side (Blotter)"]);
  const spotFx = parseBrazilianNumber(row["Spot FX"]);
  
  const status = row["Status"] as NDFRecord["status"];
  const isActionable = status === "DEAL" || status === "NOTH.DONE";
  
  const markupBps = calculateMarkupBps(fwdClient, fwd, yieldClient, yieldCcy);
  const plBrl = calculatePLBrl(isBuy, fwdClient, fwd, notional, row["Parity"], spotFx);
  
  return {
    rfqTimestamp,
    maturityDate,
    status,
    rejectedMessage: row["Rejected message"] || "",
    cnpj: row["CNPJ"] || "",
    counterparty: row["Counterparty"] || "",
    product: row["Product"] || "",
    tenorDc,
    tenorBucket: getTenorBucket(tenorDc),
    currency: row["Currency"] || "",
    parity: row["Parity"] || "",
    notional,
    notionalBucket: getNotionalBucket(notional),
    spotCost: parseBrazilianNumber(row["Spot Cost (Sett. Rate)"]),
    spotFx,
    yieldCcy,
    yieldClient,
    yieldBrlCost: parseBrazilianNumber(row["Yield (BRL) cost rate"]),
    yieldBrlClient: parseBrazilianNumber(row["Yield (BRL) client rate"]),
    fwd,
    rfqChannel: row["rfq_channel"] || "",
    fwdClient,
    sideBlotter: row["Side (Blotter)"] || "",
    side: row["Side"] || "",
    isBuy,
    isActionable,
    markupBps,
    plBrl,
  };
}

/**
 * Calculate tenor in days from RFQ timestamp to maturity date
 */
function calculateTenorDays(rfqTimestamp: Date, maturityDate: Date): number | null {
  if (!rfqTimestamp || !maturityDate || isNaN(rfqTimestamp.getTime()) || isNaN(maturityDate.getTime())) {
    return null;
  }
  const diffTime = maturityDate.getTime() - rfqTimestamp.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : null;
}

/**
 * Parse a single row with custom column mapping
 */
export function parseNDFRowWithMapping(row: any, mapping: ColumnMapping): NDFRecord {
  const rfqTimestamp = new Date(row[mapping.rfqTimestamp]);
  const maturityDate = new Date(row[mapping.maturityDate]);
  const tenorDc = calculateTenorDays(rfqTimestamp, maturityDate);
  
  const notional = mapping.notional ? parseBrazilianNumber(row[mapping.notional]) || 0 : 0;
  const fwd = mapping.fwd ? parseBrazilianNumber(row[mapping.fwd]) : null;
  const fwdClient = mapping.fwdClient ? parseBrazilianNumber(row[mapping.fwdClient]) : null;
  const yieldCcy = mapping.yieldCcy ? parseBrazilianNumber(row[mapping.yieldCcy]) : null;
  const yieldClient = mapping.yieldClient ? parseBrazilianNumber(row[mapping.yieldClient]) : null;
  const isBuy = mapping.side ? normalizeSide(row[mapping.side]) : true;
  const spotFx = mapping.spotFx ? parseBrazilianNumber(row[mapping.spotFx]) : null;
  const parity = mapping.parity ? row[mapping.parity] : "";
  
  const status = (row[mapping.status] || "QUOTE") as NDFRecord["status"];
  const isActionable = status === "DEAL" || status === "NOTH.DONE";
  
  const markupBps = calculateMarkupBps(fwdClient, fwd, yieldClient, yieldCcy);
  const plBrl = calculatePLBrl(isBuy, fwdClient, fwd, notional, parity, spotFx);
  
  return {
    rfqTimestamp,
    maturityDate,
    status,
    rejectedMessage: mapping.rejectedMessage ? row[mapping.rejectedMessage] || "" : "",
    cnpj: mapping.cnpj ? row[mapping.cnpj] || "" : "",
    counterparty: mapping.counterparty ? row[mapping.counterparty] || "" : "",
    product: mapping.product ? row[mapping.product] || "" : "",
    tenorDc,
    tenorBucket: getTenorBucket(tenorDc),
    currency: mapping.currency ? row[mapping.currency] || "" : "",
    parity,
    notional,
    notionalBucket: getNotionalBucket(notional),
    spotCost: mapping.spotCost ? parseBrazilianNumber(row[mapping.spotCost]) : null,
    spotFx,
    yieldCcy,
    yieldClient,
    yieldBrlCost: mapping.yieldBrlCost ? parseBrazilianNumber(row[mapping.yieldBrlCost]) : null,
    yieldBrlClient: mapping.yieldBrlClient ? parseBrazilianNumber(row[mapping.yieldBrlClient]) : null,
    fwd,
    rfqChannel: mapping.rfqChannel ? row[mapping.rfqChannel] || "" : "",
    fwdClient,
    sideBlotter: mapping.sideBlotter ? row[mapping.sideBlotter] || "" : "",
    side: mapping.side ? row[mapping.side] || "" : "",
    isBuy,
    isActionable,
    markupBps,
    plBrl,
  };
}

/**
 * Parse CSV file with custom column mapping
 */
export function parseCSVWithMapping(file: File, mapping: ColumnMapping): Promise<NDFRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const records = results.data.map((row: any) => parseNDFRowWithMapping(row, mapping));
          resolve(records);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Parse CSV file to NDFRecord array (using default column names)
 */
export function parseCSV(file: File): Promise<NDFRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawNDFRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const records = results.data.map(parseNDFRow);
          resolve(records);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
