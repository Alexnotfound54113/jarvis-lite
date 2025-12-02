import { useState } from "react";
import { CheckCircle2, Circle, ListTodo, Plus, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Language } from "@/hooks/useSpeech";

export interface Task {
  id: string;
  title: string;
  client?: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
}

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onAdd: (task: Omit<Task, "id">) => void;
  onDelete: (id: string) => void;
  language?: Language;
}

const priorityStyles = {
  low: "border-l-muted-foreground/30",
  medium: "border-l-primary/50",
  high: "border-l-destructive/50",
};

const translations = {
  en: {
    tasks: "Tasks",
    remaining: "remaining",
    completed: "Completed",
    noTasks: "No tasks yet. Add one below!",
    addTask: "Add task...",
    add: "Add",
    cancel: "Cancel",
    priority: "Priority",
    low: "Low",
    medium: "Medium",
    high: "High",
  },
  it: {
    tasks: "Attività",
    remaining: "rimanenti",
    completed: "Completate",
    noTasks: "Nessuna attività. Aggiungine una!",
    addTask: "Aggiungi attività...",
    add: "Aggiungi",
    cancel: "Annulla",
    priority: "Priorità",
    low: "Bassa",
    medium: "Media",
    high: "Alta",
  },
};

export const TaskList = ({
  tasks,
  onToggle,
  onAdd,
  onDelete,
  language = "en",
}: TaskListProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const t = translations[language];

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const handleAdd = () => {
    if (newTitle.trim()) {
      onAdd({
        title: newTitle.trim(),
        completed: false,
        priority: newPriority,
      });
      setNewTitle("");
      setNewPriority("medium");
      setIsAdding(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-4 shadow-soft animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <ListTodo className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">{t.tasks}</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {incompleteTasks.length} {t.remaining}
        </span>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-6 h-6 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
        >
          {isAdding ? (
            <X className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Plus className="w-3.5 h-3.5 text-primary" />
          )}
        </button>
      </div>

      {/* Add Task Form */}
      {isAdding && (
        <div className="mb-4 p-3 rounded-xl bg-secondary/50 space-y-3 animate-scale-in">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t.addTask}
            className="w-full bg-background/50 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t.priority}:</span>
            {(["low", "medium", "high"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setNewPriority(p)}
                className={cn(
                  "text-xs px-2 py-1 rounded-md transition-colors",
                  newPriority === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-background/50 hover:bg-background"
                )}
              >
                {t[p]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="flex-1 text-xs py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {t.add}
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewTitle("");
              }}
              className="text-xs px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {incompleteTasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onDelete={onDelete}
            delay={index * 50}
          />
        ))}

        {completedTasks.length > 0 && (
          <>
            <div className="border-t border-border/50 my-3" />
            <p className="text-xs text-muted-foreground mb-2">{t.completed}</p>
            {completedTasks.slice(0, 3).map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggle}
                onDelete={onDelete}
                delay={index * 50}
              />
            ))}
          </>
        )}

        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">{t.noTasks}</p>
        )}
      </div>
    </div>
  );
};

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  delay: number;
}

const TaskItem = ({ task, onToggle, onDelete, delay }: TaskItemProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onToggle(task.id);
      setIsAnimating(false);
    }, 200);
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 rounded-xl border-l-2 transition-all animate-slide-up",
        "hover:bg-secondary/50",
        priorityStyles[task.priority],
        task.completed && "opacity-50",
        isAnimating && "scale-95 opacity-70"
      )}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <button
        onClick={handleToggle}
        className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-primary" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm",
            task.completed && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>
        {task.client && (
          <p className="text-xs text-muted-foreground mt-0.5">{task.client}</p>
        )}
      </div>
      <button
        onClick={() => onDelete(task.id)}
        className={cn(
          "flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all",
          "hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
          showDelete ? "opacity-100" : "opacity-0 sm:group-hover:opacity-100"
        )}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
