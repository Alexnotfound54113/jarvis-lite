import { useState, useEffect } from "react";
import { 
  FileText, 
  FileUp, 
  FileDown, 
  Folder, 
  FolderOpen,
  Upload,
  Trash2,
  Download,
  ChevronRight,
  ChevronDown,
  X,
  File,
  FileSpreadsheet,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InputFile {
  id: string;
  filename: string;
  category: string;
  subcategory: string | null;
  mime_type: string;
  file_size: number | null;
  storage_path: string | null;
  created_at: string;
}

interface OutputFile {
  id: string;
  filename: string;
  file_type: string;
  mime_type: string;
  content: string | null;
  storage_path: string | null;
  created_at: string;
}

interface FilesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  language: "en" | "it";
}

const FILE_CATEGORIES = [
  { id: "contracts", label: { en: "Contracts", it: "Contratti" }, icon: FileText },
  { id: "accounting", label: { en: "Accounting", it: "Contabilità" }, icon: FileSpreadsheet },
  { id: "emails", label: { en: "Emails", it: "Email" }, icon: Mail },
  { id: "general", label: { en: "General", it: "Generale" }, icon: File },
];

export function FilesSidebar({ isOpen, onClose, language }: FilesSidebarProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  const [inputFiles, setInputFiles] = useState<InputFile[]>([]);
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["contracts"]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  const fetchFiles = async () => {
    const [inputRes, outputRes] = await Promise.all([
      supabase.from("input_files").select("*").order("created_at", { ascending: false }),
      supabase.from("output_files").select("*").order("created_at", { ascending: false }),
    ]);

    if (inputRes.data) setInputFiles(inputRes.data);
    if (outputRes.data) setOutputFiles(outputRes.data);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Upload to storage
      const filePath = `input/${category}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("friday-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Read file content for text files
      let content = null;
      if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        content = await file.text();
      }

      // Save to database
      const { error: dbError } = await supabase.from("input_files").insert({
        filename: file.name,
        category,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
        storage_path: filePath,
        content,
      });

      if (dbError) throw dbError;

      toast({
        title: language === "en" ? "File uploaded" : "File caricato",
        description: file.name,
      });

      fetchFiles();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: language === "en" ? "Upload failed" : "Caricamento fallito",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteFile = async (file: InputFile | OutputFile, type: "input" | "output") => {
    try {
      const table = type === "input" ? "input_files" : "output_files";
      const { error } = await supabase.from(table).delete().eq("id", file.id);
      
      if (error) throw error;

      // Also delete from storage if it exists
      if ("storage_path" in file && file.storage_path) {
        await supabase.storage.from("friday-files").remove([file.storage_path]);
      }

      toast({
        title: language === "en" ? "File deleted" : "File eliminato",
      });

      fetchFiles();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: language === "en" ? "Delete failed" : "Eliminazione fallita",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (file: InputFile | OutputFile, type: "input" | "output") => {
    try {
      if ("content" in file && file.content) {
        // Download from content
        const blob = new Blob([file.content], { type: file.mime_type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else if ("storage_path" in file && file.storage_path) {
        // Download from storage
        const { data } = await supabase.storage
          .from("friday-files")
          .download(file.storage_path);
        
        if (data) {
          const url = URL.createObjectURL(data);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.filename;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: language === "en" ? "Download failed" : "Download fallito",
        variant: "destructive",
      });
    }
  };

  const getFilesByCategory = (category: string) => {
    return inputFiles.filter(f => f.category === category);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-80 bg-sidebar-background border-r border-sidebar-border shadow-soft flex flex-col animate-slide-in-left">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <h2 className="font-semibold text-sidebar-foreground">
          {language === "en" ? "Files" : "File"}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-sidebar-border">
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
          {language === "en" ? "Input" : "Input"}
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
          {language === "en" ? "Output" : "Output"}
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === "input" ? (
          <div className="p-2">
            <p className="text-xs text-muted-foreground px-2 py-3">
              {language === "en" 
                ? "Upload company files for FRIDAY to use with RAG for generating contracts, emails, and accounting documents."
                : "Carica i file aziendali per FRIDAY da usare con RAG per generare contratti, email e documenti contabili."}
            </p>
            
            {FILE_CATEGORIES.map(category => {
              const CategoryIcon = category.icon;
              const files = getFilesByCategory(category.id);
              const isExpanded = expandedCategories.includes(category.id);

              return (
                <div key={category.id} className="mb-1">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
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
                      {category.label[language]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {files.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-6 pl-2 border-l border-sidebar-border">
                      {/* Upload button */}
                      <label className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                        <Upload className="w-3 h-3" />
                        {language === "en" ? "Upload file..." : "Carica file..."}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, category.id)}
                          disabled={isUploading}
                        />
                      </label>

                      {/* Files list */}
                      {files.map(file => (
                        <div
                          key={file.id}
                          className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-sidebar-accent transition-colors"
                        >
                          <CategoryIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="flex-1 text-xs truncate" title={file.filename}>
                            {file.filename}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatFileSize(file.file_size)}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                            <button
                              onClick={() => handleDownload(file, "input")}
                              className="p-1 hover:bg-background rounded"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteFile(file, "input")}
                              className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {files.length === 0 && (
                        <p className="text-xs text-muted-foreground px-2 py-1">
                          {language === "en" ? "No files" : "Nessun file"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-2">
            <p className="text-xs text-muted-foreground px-2 py-3">
              {language === "en" 
                ? "Files generated by FRIDAY during conversations."
                : "File generati da FRIDAY durante le conversazioni."}
            </p>

            {outputFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileDown className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {language === "en" ? "No generated files yet" : "Nessun file generato"}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {outputFiles.map(file => (
                  <div
                    key={file.id}
                    className="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
                  >
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" title={file.filename}>
                        {file.filename}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <button
                        onClick={() => handleDownload(file, "output")}
                        className="p-1 hover:bg-background rounded"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file, "output")}
                        className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
