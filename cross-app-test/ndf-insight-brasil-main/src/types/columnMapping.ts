export interface ColumnMapping {
  // Required fields
  rfqTimestamp: string;
  maturityDate: string;
  status: string;
  notional: string;
  side: string;
  
  // Optional but recommended
  counterparty?: string;
  currency?: string;
  parity?: string;
  spotCost?: string;
  spotFx?: string;
  yieldCcy?: string;
  yieldClient?: string;
  yieldBrlCost?: string;
  yieldBrlClient?: string;
  fwd?: string;
  fwdClient?: string;
  
  // Additional optional fields
  cnpj?: string;
  product?: string;
  rfqChannel?: string;
  sideBlotter?: string;
  rejectedMessage?: string;
}

export interface RequiredField {
  key: keyof ColumnMapping;
  label: string;
  description: string;
  required: boolean;
}

export const FIELD_DEFINITIONS: RequiredField[] = [
  {
    key: "rfqTimestamp",
    label: "RFQ Timestamp",
    description: "Data e hora da cotação (YYYY-MM-DD HH:MM:SS)",
    required: true,
  },
  {
    key: "maturityDate",
    label: "Maturity Date",
    description: "Data de vencimento (YYYY-MM-DD)",
    required: true,
  },
  {
    key: "status",
    label: "Status",
    description: "Status da operação (DEAL, NOTH.DONE, REJECTED, etc.)",
    required: true,
  },
  {
    key: "notional",
    label: "Notional",
    description: "Valor nocional da operação",
    required: true,
  },
  {
    key: "side",
    label: "Side",
    description: "Lado da operação (Compra/Venda ou BUY/SELL)",
    required: true,
  },
  {
    key: "counterparty",
    label: "Counterparty",
    description: "Nome da contraparte",
    required: false,
  },
  {
    key: "currency",
    label: "Currency",
    description: "Moeda da operação (USD, EUR, etc.)",
    required: false,
  },
  {
    key: "parity",
    label: "Parity",
    description: "Paridade (ex: USD/BRL)",
    required: false,
  },
  {
    key: "fwd",
    label: "FWD",
    description: "Taxa forward (custo)",
    required: false,
  },
  {
    key: "fwdClient",
    label: "FWD-Client",
    description: "Taxa forward (cliente)",
    required: false,
  },
  {
    key: "yieldCcy",
    label: "Yield (CCY)",
    description: "Yield em moeda estrangeira",
    required: false,
  },
  {
    key: "yieldClient",
    label: "Yield (Client)",
    description: "Yield do cliente",
    required: false,
  },
  {
    key: "spotFx",
    label: "Spot FX",
    description: "Taxa de câmbio spot",
    required: false,
  },
  {
    key: "rejectedMessage",
    label: "Rejected Message",
    description: "Motivo da rejeição",
    required: false,
  },
];
