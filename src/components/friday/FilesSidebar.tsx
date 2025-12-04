import { useState } from "react";
import { 
  FileText, 
  FileUp, 
  FileDown, 
  Folder, 
  FolderOpen,
  Upload,
  ChevronRight,
  ChevronDown,
  X,
  File,
  FileSpreadsheet,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FilesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  language: "en" | "it";
}

const FILE_CATEGORIES = [
  { id: "contracts", label: { en: "Contracts", it: "Contratti" }, Icon: FileText },
  { id: "accounting", label: { en: "Accounting", it: "Contabilità" }, Icon: FileSpreadsheet },
  { id: "emails", label: { en: "Emails", it: "Email" }, Icon: Mail },
  { id: "general", label: { en: "General", it: "Generale" }, Icon: File },
];

export function FilesSidebar({ isOpen, onClose, language }: FilesSidebarProps) {
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["contracts"]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-80 bg-background border-r border-border shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">
            {language === "en" ? "Files" : "File"}
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("input")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
              activeTab === "input"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileUp className="w-4 h-4" />
            Input
          </button>
          <button
            onClick={() => setActiveTab("output")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
              activeTab === "output"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileDown className="w-4 h-4" />
            Output
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === "input" ? (
            <div>
              <p className="text-xs text-muted-foreground mb-4">
                {language === "en" 
                  ? "Upload company files for FRIDAY to use with RAG for generating contracts, emails, and accounting documents."
                  : "Carica i file aziendali per FRIDAY da usare con RAG per generare contratti, email e documenti contabili."}
              </p>
              
              {FILE_CATEGORIES.map(({ id, label, Icon }) => {
                const isExpanded = expandedCategories.includes(id);

                return (
                  <div key={id} className="mb-1">
                    <button
                      onClick={() => toggleCategory(id)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className="w-4 h-4 text-primary" />
                      ) : (
                        <Folder className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="flex-1 text-left text-sm font-medium">
                        {label[language]}
                      </span>
                      <span className="text-xs text-muted-foreground">0</span>
                    </button>

                    {isExpanded && (
                      <div className="ml-6 pl-2 border-l border-border">
                        <label className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                          <Upload className="w-3 h-3" />
                          {language === "en" ? "Upload file..." : "Carica file..."}
                          <input type="file" className="hidden" />
                        </label>
                        <p className="text-xs text-muted-foreground px-2 py-1">
                          {language === "en" ? "No files yet" : "Nessun file"}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-4">
                {language === "en" 
                  ? "Files generated by FRIDAY during conversations."
                  : "File generati da FRIDAY durante le conversazioni."}
              </p>

              <div className="text-center py-8 text-muted-foreground">
                <FileDown className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {language === "en" ? "No generated files yet" : "Nessun file generato"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
