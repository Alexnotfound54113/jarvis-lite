import { FileText, MessageSquare, CheckSquare, Calendar, Download, Eye, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface GeneratedFile {
  id: string;
  filename: string;
  content: string;
  mime_type: string;
  created_at: string;
}

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatedFiles: GeneratedFile[];
  onDeleteFile: (id: string) => void;
  language: "en" | "it";
}

type TabType = "files" | "conversations" | "tasks" | "appointments";

const tabs = {
  en: {
    files: "Generated Files",
    conversations: "Conversations",
    tasks: "Tasks",
    appointments: "Appointments",
    noFiles: "No files generated yet",
    noFilesDesc: "Ask Jarvis to create documents, and they'll appear here.",
    preview: "Preview",
    download: "Download",
    delete: "Delete",
    comingSoon: "Coming soon...",
  },
  it: {
    files: "File Generati",
    conversations: "Conversazioni",
    tasks: "Attività",
    appointments: "Appuntamenti",
    noFiles: "Nessun file generato",
    noFilesDesc: "Chiedi a Jarvis di creare documenti e appariranno qui.",
    preview: "Anteprima",
    download: "Scarica",
    delete: "Elimina",
    comingSoon: "Prossimamente...",
  },
};

export const Sidebar = ({ open, onOpenChange, generatedFiles = [], onDeleteFile, language }: SidebarProps) => {
  const t = tabs[language] || tabs.en;
  const [activeTab, setActiveTab] = useState<TabType>("files");
  const [previewFile, setPreviewFile] = useState<GeneratedFile | null>(null);

  // Ensure generatedFiles is always an array
  const safeFiles = Array.isArray(generatedFiles) ? generatedFiles : [];

  const handleDownload = (file: GeneratedFile) => {
    if (!file?.content || !file?.filename) return;
    const blob = new Blob([file.content], { type: file.mime_type || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(language === "it" ? "it-IT" : "en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const menuItems: { id: TabType; icon: typeof FileText; label: string; count?: number }[] = [
    { id: "files", icon: FileText, label: t.files, count: safeFiles.length },
    { id: "conversations", icon: MessageSquare, label: t.conversations },
    { id: "tasks", icon: CheckSquare, label: t.tasks },
    { id: "appointments", icon: Calendar, label: t.appointments },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[320px] sm:w-[400px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-left">Menu</SheetTitle>
          </SheetHeader>

          {/* Tab Navigation */}
          <div className="border-b overflow-x-auto">
            <div className="flex p-2 gap-1">
              {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {item.count !== undefined && item.count > 0 && (
                      <Badge variant="secondary" className={cn("ml-1 h-5 px-1.5", activeTab === item.id && "bg-primary-foreground/20 text-primary-foreground")}>
                        {item.count}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {activeTab === "files" && (
                <div className="space-y-3">
                  {safeFiles.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="font-medium text-muted-foreground">{t.noFiles}</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">{t.noFilesDesc}</p>
                    </div>
                  ) : (
                    safeFiles.map((file) => (
                      <div key={file.id} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{file.filename || "Untitled"}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(file.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setPreviewFile(file)}>
                            <Eye className="w-3 h-3 mr-1" />
                            {t.preview}
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDownload(file)}>
                            <Download className="w-3 h-3 mr-1" />
                            {t.download}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDeleteFile(file.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab !== "files" && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t.comingSoon}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {previewFile?.filename}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-4">
            <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
              {previewFile?.content}
            </pre>
          </ScrollArea>
          {previewFile && (
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => handleDownload(previewFile)}>
                <Download className="w-4 h-4 mr-2" />
                {t.download}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
