import { createContext, useContext, useState, ReactNode } from "react";
import type { NDFRecord } from "@/types/ndf";

interface NDFDataContextType {
  data: NDFRecord[];
  setData: (data: NDFRecord[]) => void;
  clearData: () => void;
}

const NDFDataContext = createContext<NDFDataContextType | undefined>(undefined);

export function NDFDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<NDFRecord[]>([]);

  const clearData = () => setData([]);

  return (
    <NDFDataContext.Provider value={{ data, setData, clearData }}>
      {children}
    </NDFDataContext.Provider>
  );
}

export function useNDFData() {
  const context = useContext(NDFDataContext);
  if (context === undefined) {
    throw new Error("useNDFData must be used within NDFDataProvider");
  }
  return context;
}
