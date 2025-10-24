import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Calendar, Filter } from "lucide-react";

interface FilterPanelProps {
  onFilterChange?: (filters: any) => void;
}

export function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const handleYTD = () => {
    // TODO: Implement YTD filter
  };

  const handleMTD = () => {
    // TODO: Implement MTD filter
  };

  const handleD1D2 = () => {
    // TODO: Implement D1|D2 filter
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Período
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleYTD}>
              YTD
            </Button>
            <Button variant="outline" size="sm" onClick={handleMTD}>
              MTD
            </Button>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleD1D2}>
            D1 | D2
          </Button>
          <Button variant="outline" size="sm" className="w-full mt-2">
            Personalizado
          </Button>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-medium mb-2">Contraparte</p>
          <p className="text-xs text-muted-foreground">
            Filtros adicionais serão ativados após carregar dados
          </p>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-medium mb-2">Moeda / Paridade</p>
          <p className="text-xs text-muted-foreground">
            Selecione USD/BRL, EUR/BRL, etc.
          </p>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-medium mb-2">Status</p>
          <p className="text-xs text-muted-foreground">
            DEAL, NOTH.DONE, REJECTED, etc.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
