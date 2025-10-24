import { useState } from "react";
import { Link } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen, BarChart3, Upload } from "lucide-react";
import { FilterPanel } from "../components/FilterPanel";
import { CSVImportWizard } from "../components/wizard/CSVImportWizard";
import { useNDFData } from "../contexts/NDFDataContext";
import { Button } from "../components/ui/button";
import Overview from "./Overview";

//pinia
import { useToggleFilter} from '../../../../cross-app-test/src/store/index.js'

export default function Dashboard() {
  const [showFilters, setShowFilters] = useState(true);
  const { data, setData } = useNDFData();
  const [wizardOpen, setWizardOpen] = useState(false);
  function handleClick() {
    
    setShowFilters(!showFilters)
    const piniaStore = (window as any).toggleStore
    piniaStore?.set(!showFilters)
    console.log(piniaStore.showFilters)
 
  }
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-card border-b z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h2 className="font-bold">NDF e-Sales Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            {data.length > 0 ? "Recarregar CSV" : "Carregar CSV"}
          </Button>
          <Link to="/analytics">
            <Button variant="default" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={handleClick}
        className="fixed top-13 left-4 z-50 p-2 bg-card border rounded-lg shadow-lg hover:bg-accent transition-colors"
        aria-label="Toggle filters"
      >
        {showFilters ? (
          <PanelLeftClose className="w-5 h-5" />
        ) : (
          <PanelLeftOpen className="w-5 h-5" />
        )}
      </button>

      {/* Overlay for mobile */}
      {showFilters && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setShowFilters(false)}
        />
      )}
      {/* Left Filter Panel */}
      <aside
        className={`fixed top-14 left-0 bottom-0 w-64 border-r bg-card p-4 z-40 transform transition-transform duration-300 ${
          showFilters ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <FilterPanel />
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 p-6 pt-20 transition-all duration-300 ${
          showFilters ? "lg:ml-64" : "lg:ml-0"
        }`}
      >
        <Overview />
      </main>

      <CSVImportWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onImportComplete={setData}
      />
    </div>
  );
}
