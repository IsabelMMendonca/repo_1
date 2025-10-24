// Type definitions for NDF trading data

export interface RawNDFRow {
  "RFQ Timestamp": string;
  "Maturity Date": string;
  "Status": string;
  "Rejected message": string;
  "CNPJ": string;
  "Counterparty": string;
  "Product": string;
  "DC (adj)": string;
  "Currency": string;
  "Parity": string;
  "Notional": string;
  "Spot Cost (Sett. Rate)": string;
  "Spot FX": string;
  "Yield (CCY)": string;
  "Yield (Client)": string;
  "Yield (BRL) cost rate": string;
  "Yield (BRL) client rate": string;
  "FWD": string;
  "rfq_channel": string;
  "FWD-Client": string;
  "Side (Blotter)": string;
  "Side": string;
}

export interface NDFRecord {
  rfqTimestamp: Date;
  maturityDate: Date;
  status: "DEAL" | "NOTH.DONE" | "REJECTED" | "EXP.QUOTE" | "QUOTE";
  rejectedMessage: string;
  cnpj: string;
  counterparty: string;
  product: string;
  tenorDc: number | null;
  tenorBucket: string;
  currency: string;
  parity: string;
  notional: number;
  notionalBucket: string;
  spotCost: number | null;
  spotFx: number | null;
  yieldCcy: number | null;
  yieldClient: number | null;
  yieldBrlCost: number | null;
  yieldBrlClient: number | null;
  fwd: number | null;
  rfqChannel: string;
  fwdClient: number | null;
  sideBlotter: string;
  side: string;
  isBuy: boolean;
  isActionable: boolean;
  markupBps: number | null;
  plBrl: number | null;
}

export interface KPIMetrics {
  volumeTotal: number;
  resultadoTotal: number;
  markupMedio: number;
  prazoMedioPonderado: number;
  taxaConversao: number;
}

export interface FilterState {
  dateRange: {
    start: Date | null;
    end: Date | null;
    preset: "YTD" | "MTD" | "D1" | "D2" | "CUSTOM" | null;
  };
  counterparties: string[];
  currencies: string[];
  statuses: string[];
  sides: string[];
  channels: string[];
  notionalRange: [number, number];
  tenorRange: [number, number];
}
