import { useState, useEffect, useRef } from "react";
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
  Mail,
  Trash2,
  Download,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FilesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  language: "en" | "it";
}

interface InputFile {
  id: string;
  filename: string;
  category: string;
  mime_type: string;
  created_at: string;
  file_size: number | null;
}

interface OutputFile {
  id: string;
  filename: string;
  content: string;
  mime_type: string;
  created_at: string;
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
  const [inputFiles, setInputFiles] = useState<InputFile[]>([]);
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { toast } = useToast();

  // Fetch files on mount
  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const [inputRes, outputRes] = await Promise.all([
        supabase.from('input_files').select('id, filename, category, mime_type, created_at, file_size').order('created_at', { ascending: false }),
        supabase.from('generated_files').select('id, filename, content, mime_type, created_at').order('created_at', { ascending: false })
      ]);
      
      if (inputRes.data) setInputFiles(inputRes.data);
      if (outputRes.data) setOutputFiles(outputRes.data);
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleFileUpload = async (category: string, file: File) => {
    setUploading(category);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-file`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      toast({
        title: language === "en" ? "File uploaded" : "File caricato",
        description: language === "en" 
          ? `${file.name} has been processed with ${result.file?.chunks || 0} chunks for RAG.`
          : `${file.name} è stato elaborato con ${result.file?.chunks || 0} chunk per RAG.`,
      });

      fetchFiles();
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: language === "en" ? "Upload failed" : "Caricamento fallito",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteInput = async (fileId: string) => {
    try {
      // Delete chunks first (cascade should handle this but being explicit)
      await supabase.from('file_chunks').delete().eq('file_id', fileId);
      await supabase.from('input_files').delete().eq('id', fileId);
      
      setInputFiles(prev => prev.filter(f => f.id !== fileId));
      toast({
        title: language === "en" ? "File deleted" : "File eliminato",
      });
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleDownloadOutput = (file: OutputFile) => {
    const blob = new Blob([file.content], { type: file.mime_type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilesByCategory = (category: string) => {
    return inputFiles.filter(f => f.category === category);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-80 bg-background border-r border-border shadow-lg flex flex-col animate-slide-in-left">
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeTab === "input" ? (
            <div>
              <p className="text-xs text-muted-foreground mb-4">
                {language === "en" 
                  ? "Upload company files for FRIDAY to use with RAG for generating contracts, emails, and accounting documents."
                  : "Carica i file aziendali per FRIDAY da usare con RAG per generare contratti, email e documenti contabili."}
              </p>
              
              {FILE_CATEGORIES.map(({ id, label, Icon }) => {
                const isExpanded = expandedCategories.includes(id);
                const categoryFiles = getFilesByCategory(id);
                const isUploading = uploading === id;

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
                      <span className="text-xs text-muted-foreground">{categoryFiles.length}</span>
                    </button>

                    {isExpanded && (
                      <div className="ml-6 pl-2 border-l border-border">
                        <label className={cn(
                          "flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors",
                          isUploading && "pointer-events-none opacity-50"
                        )}>
                          {isUploading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          {isUploading 
                            ? (language === "en" ? "Processing..." : "Elaborazione...")
                            : (language === "en" ? "Upload file..." : "Carica file...")}
                          <input 
                            type="file" 
                            className="hidden" 
                            ref={el => fileInputRefs.current[id] = el}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(id, file);
                                e.target.value = '';
                              }
                            }}
                            accept=".txt,.md,.csv,.json,.pdf,.docx,.xlsx,.doc,.xls"
                          />
                        </label>
                        
                        {categoryFiles.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-2 py-1">
                            {language === "en" ? "No files yet" : "Nessun file"}
                          </p>
                        ) : (
                          categoryFiles.map(file => (
                            <div key={file.id} className="flex items-center gap-2 px-2 py-1.5 group">
                              <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="flex-1 text-xs truncate" title={file.filename}>
                                {file.filename}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatFileSize(file.file_size)}
                              </span>
                              <button
                                onClick={() => handleDeleteInput(file.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </button>
                            </div>
                          ))
                        )}
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
                    <div key={file.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-accent group">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" title={file.filename}>{file.filename}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadOutput(file)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-primary/10 rounded transition-all"
                      >
                        <Download className="w-3 h-3 text-primary" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
