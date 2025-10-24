import { useState, useRef } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { parseCSV } from "../utils/csvParser";
import { NDFRecord } from "../types/ndf";
import { toast } from "sonner";

interface CSVUploaderProps {
  onDataLoaded: (data: NDFRecord[]) => void;
}

export function CSVUploader({ onDataLoaded }: CSVUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error("Por favor, selecione um arquivo CSV válido");
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const records = await parseCSV(selectedFile);
      onDataLoaded(records);
      toast.success(`${records.length} registros carregados com sucesso`);
    } catch (error) {
      console.error("Erro ao processar CSV:", error);
      toast.error("Erro ao processar o arquivo CSV");
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onDataLoaded([]);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {!file ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg hover:border-primary transition-colors">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Carregue o arquivo CSV mensal de operações NDF
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <Button asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar Arquivo CSV
                </span>
              </Button>
            </label>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {loading && (
          <p className="text-sm text-center text-muted-foreground mt-4">
            Processando dados...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
