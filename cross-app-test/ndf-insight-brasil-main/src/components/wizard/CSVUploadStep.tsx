import { useRef } from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

interface CSVUploadStepProps {
  file: File | null;
  onFileSelect: (file: File) => void;
}

export function CSVUploadStep({ file, onFileSelect }: CSVUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith(".csv")) {
      onFileSelect(selectedFile);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Selecione o arquivo CSV</h3>
        <p className="text-sm text-muted-foreground">
          Faça upload do arquivo CSV contendo os dados de NDF
        </p>
      </div>

      <Card className="p-8 border-2 border-dashed">
        <div className="flex flex-col items-center justify-center space-y-4">
          {!file ? (
            <>
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Arraste e solte ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-1">Arquivos CSV (máx. 20MB)</p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()}>
                Selecionar Arquivo
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-full bg-success/10 p-4">
                <FileText className="w-8 h-8 text-success" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                Escolher Outro Arquivo
              </Button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </Card>
    </div>
  );
}
