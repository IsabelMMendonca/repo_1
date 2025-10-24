import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { CheckCircle2, FileText } from "lucide-react";
import { ColumnMapping } from "../../types/columnMapping";
import { formatBrazilianNumber } from "../../utils/formatters";

interface ConfirmImportStepProps {
  file: File;
  mapping: Partial<ColumnMapping>;
  previewData: any[];
  recordCount: number;
}

export function ConfirmImportStep({
  file,
  mapping,
  previewData,
  recordCount,
}: ConfirmImportStepProps) {
  const mappedFields = Object.entries(mapping).filter(([_, value]) => value);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="rounded-full bg-success/10 p-3">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
        </div>
        <h3 className="text-lg font-semibold">Confirme a importação</h3>
        <p className="text-sm text-muted-foreground">
          Revise os dados antes de importar
        </p>
      </div>

      {/* File Info */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBrazilianNumber(recordCount, 0)} registros · {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <Badge variant="secondary">{mappedFields.length} campos mapeados</Badge>
        </div>
      </Card>

      {/* Mapped Fields Summary */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">Campos Mapeados</h4>
        <div className="grid grid-cols-2 gap-3">
          {mappedFields.map(([field, csvColumn]) => (
            <div key={field} className="text-sm">
              <span className="text-muted-foreground">{field}:</span>{" "}
              <span className="font-medium">{csvColumn}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Preview Data */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">Prévia dos Dados (primeiras 3 linhas)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                {mappedFields.map(([field, _]) => (
                  <th key={field} className="text-left p-2 font-medium">
                    {field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.slice(0, 3).map((row, idx) => (
                <tr key={idx} className="border-b">
                  {mappedFields.map(([_, csvColumn]) => (
                    <td key={csvColumn} className="p-2 font-mono">
                      {row[csvColumn as string]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
