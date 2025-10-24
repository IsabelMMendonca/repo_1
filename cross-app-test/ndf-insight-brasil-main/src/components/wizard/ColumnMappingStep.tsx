import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Card } from "../../components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { FIELD_DEFINITIONS, type ColumnMapping } from "../../types/columnMapping";

interface ColumnMappingStepProps {
  csvColumns: string[];
  mapping: Partial<ColumnMapping>;
  onMappingChange: (mapping: Partial<ColumnMapping>) => void;
  previewData: any[];
}

export function ColumnMappingStep({
  csvColumns,
  mapping,
  onMappingChange,
  previewData,
}: ColumnMappingStepProps) {
  const handleFieldMapping = (field: keyof ColumnMapping, csvColumn: string) => {
    onMappingChange({
      ...mapping,
      [field]: csvColumn === "none" ? undefined : csvColumn,
    });
  };

  const requiredFields = FIELD_DEFINITIONS.filter((f) => f.required);
  const optionalFields = FIELD_DEFINITIONS.filter((f) => !f.required);
  const allRequiredMapped = requiredFields.every((f) => mapping[f.key]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Mapeie as colunas do CSV</h3>
        <p className="text-sm text-muted-foreground">
          Associe cada campo necessário com a coluna correspondente do seu CSV
        </p>
      </div>

      {!allRequiredMapped && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Por favor, mapeie todos os campos obrigatórios para continuar
          </AlertDescription>
        </Alert>
      )}

      {allRequiredMapped && (
        <Alert className="bg-success/10 border-success/20">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            Todos os campos obrigatórios foram mapeados!
          </AlertDescription>
        </Alert>
      )}

      {/* Required Fields */}
      <Card className="p-4">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          Campos Obrigatórios
          <Badge variant="destructive" className="text-xs">Requerido</Badge>
        </h4>
        <div className="space-y-4">
          {requiredFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">{field.label}</label>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
                <Select
                  value={mapping[field.key] || "none"}
                  onValueChange={(value) => handleFieldMapping(field.key, value)}
                >
                  <SelectTrigger className="w-[250px] bg-background">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="none">Não mapear</SelectItem>
                    {csvColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {mapping[field.key] && previewData.length > 0 && (
                <div className="ml-4 p-2 bg-muted/50 rounded text-xs">
                  <span className="text-muted-foreground">Exemplo: </span>
                  <span className="font-mono">{previewData[0][mapping[field.key]!]}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Optional Fields */}
      <Card className="p-4">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          Campos Opcionais
          <Badge variant="secondary" className="text-xs">Opcional</Badge>
        </h4>
        <div className="space-y-4">
          {optionalFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">{field.label}</label>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
                <Select
                  value={mapping[field.key] || "none"}
                  onValueChange={(value) => handleFieldMapping(field.key, value)}
                >
                  <SelectTrigger className="w-[250px] bg-background">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="none">Não mapear</SelectItem>
                    {csvColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {mapping[field.key] && previewData.length > 0 && (
                <div className="ml-4 p-2 bg-muted/50 rounded text-xs">
                  <span className="text-muted-foreground">Exemplo: </span>
                  <span className="font-mono">{previewData[0][mapping[field.key]!]}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
