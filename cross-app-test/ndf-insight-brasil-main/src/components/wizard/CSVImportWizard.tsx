import { useState } from "react";
import Papa from "papaparse";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Progress } from "../../components/ui/progress";
import { CSVUploadStep } from "./CSVUploadStep";
import { ColumnMappingStep } from "./ColumnMappingStep";
import { ConfirmImportStep } from "./ConfirmImportStep";
import { parseCSVWithMapping } from "../../utils/csvParser";
import { ColumnMapping, FIELD_DEFINITIONS } from "../../types/columnMapping";
import { NDFRecord } from "../../types/ndf";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface CSVImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (data: NDFRecord[]) => void;
}

export function CSVImportWizard({ open, onOpenChange, onImportComplete }: CSVImportWizardProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [loading, setLoading] = useState(false);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);

    try {
      // First parse to get row count
      Papa.parse(selectedFile, {
        preview: 0,
        complete: (countResults) => {
          setTotalRows(countResults.data.length);
        },
      });

      // Then parse for preview
      Papa.parse(selectedFile, {
        header: true,
        preview: 5,
        skipEmptyLines: true,
        complete: (results) => {
          const columns = results.meta.fields || [];
          setCsvColumns(columns);
          setPreviewData(results.data);

          // Auto-map columns with exact matches
          const autoMapping: Partial<ColumnMapping> = {};
          FIELD_DEFINITIONS.forEach((field) => {
            const exactMatch = columns.find(
              (col) => col.toLowerCase() === field.label.toLowerCase()
            );
            if (exactMatch) {
              autoMapping[field.key] = exactMatch;
            }
          });
          setMapping(autoMapping);
          setLoading(false);
        },
        error: (error) => {
          toast.error("Erro ao ler o arquivo CSV");
          console.error(error);
          setLoading(false);
        },
      });
    } catch (error) {
      toast.error("Erro ao processar o arquivo");
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !file) {
      toast.error("Por favor, selecione um arquivo CSV");
      return;
    }

    if (step === 2) {
      const requiredFields = FIELD_DEFINITIONS.filter((f) => f.required);
      const allMapped = requiredFields.every((f) => mapping[f.key]);
      if (!allMapped) {
        toast.error("Por favor, mapeie todos os campos obrigatórios");
        return;
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const data = await parseCSVWithMapping(file, mapping as ColumnMapping);
      toast.success(`${data.length} registros importados com sucesso!`);
      onImportComplete(data);
      handleClose();
    } catch (error) {
      toast.error("Erro ao importar os dados");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setCsvColumns([]);
    setPreviewData([]);
    setTotalRows(0);
    setMapping({});
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar CSV - Etapa {step} de {totalSteps}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={progress} className="h-2" />

          <div className="min-h-[400px]">
            {step === 1 && <CSVUploadStep file={file} onFileSelect={handleFileSelect} />}

            {step === 2 && (
              <ColumnMappingStep
                csvColumns={csvColumns}
                mapping={mapping}
                onMappingChange={setMapping}
                previewData={previewData}
              />
            )}

            {step === 3 && file && (
              <ConfirmImportStep
                file={file}
                mapping={mapping}
                previewData={previewData}
                recordCount={totalRows}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>

              {step < totalSteps ? (
                <Button onClick={handleNext} disabled={loading || !file}>
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleImport} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    "Importar Dados"
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
