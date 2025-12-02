import { useState } from "react";
import { CheckCircle2, Circle, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

const priorityStyles = {
  low: "border-l-muted-foreground/30",
  medium: "border-l-primary/50",
  high: "border-l-destructive/50",
};

export const TaskList = ({ tasks, onToggle }: TaskListProps) => {
  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="glass rounded-2xl p-4 shadow-soft animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <ListTodo className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Tasks</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {incompleteTasks.length} remaining
        </span>
      </div>

      <div className="space-y-2">
        {incompleteTasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            delay={index * 50}
          />
        ))}

        {completedTasks.length > 0 && (
          <>
            <div className="border-t border-border/50 my-3" />
            <p className="text-xs text-muted-foreground mb-2">Completed</p>
            {completedTasks.slice(0, 3).map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggle}
                delay={index * 50}
              />
            ))}
          </>
        )}

        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            No tasks yet. Ask Jarvis to add some!
          </p>
        )}
      </div>
    </div>
  );
};

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  delay: number;
}

const TaskItem = ({ task, onToggle, delay }: TaskItemProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onToggle(task.id);
      setIsAnimating(false);
    }, 200);
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-xl border-l-2 transition-all text-left animate-slide-up",
        "hover:bg-secondary/50 active:scale-[0.98]",
        priorityStyles[task.priority],
        task.completed && "opacity-50",
        isAnimating && "scale-95 opacity-70"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex-shrink-0 mt-0.5">
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-primary" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
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
    </button>
  );
};
