import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/components/jarvis/TaskList";
import { Appointment } from "@/components/jarvis/AppointmentWidget";

export interface GeneratedFile {
  id: string;
  filename: string;
  content: string;
  mime_type: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export const useDatabase = () => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load tasks from database
  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading tasks:", error);
      return;
    }

    setTasks(
      data.map((t) => ({
        id: t.id,
        title: t.title,
        client: t.client || undefined,
        completed: t.completed,
        priority: t.priority as "low" | "medium" | "high",
      }))
    );
  }, []);

  // Load appointments from database
  const loadAppointments = useCallback(async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      console.error("Error loading appointments:", error);
      return;
    }

    setAppointments(
      data.map((a) => ({
        id: a.id,
        title: a.title,
        client: a.client || undefined,
        date: new Date(a.date),
        duration: a.duration,
        location: a.location || undefined,
        color: (a.color || "blue") as "blue" | "green" | "purple" | "orange",
      }))
    );
  }, []);

  // Load generated files
  const loadGeneratedFiles = useCallback(async () => {
    const { data, error } = await supabase
      .from("generated_files")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error loading files:", error);
      return;
    }

    setGeneratedFiles(data);
  }, []);

  // Create or get current conversation
  const getOrCreateConversation = useCallback(async () => {
    // Check for recent conversation (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .gte("updated_at", oneHourAgo)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      setConversationId(existing[0].id);
      return existing[0].id;
    }

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({ title: null })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return null;
    }

    setConversationId(newConv.id);
    return newConv.id;
  }, []);

  // Save message to database
  const saveMessage = useCallback(
    async (role: "user" | "assistant", content: string) => {
      let convId = conversationId;
      if (!convId) {
        convId = await getOrCreateConversation();
      }

      if (!convId) return;

      const { error } = await supabase.from("messages").insert({
        conversation_id: convId,
        role,
        content,
      });

      if (error) {
        console.error("Error saving message:", error);
      }

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);
    },
    [conversationId, getOrCreateConversation]
  );

  // Load conversation history
  const loadConversationHistory = useCallback(async (): Promise<DbMessage[]> => {
    const convId = await getOrCreateConversation();
    if (!convId) return [];

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading history:", error);
      return [];
    }

    return data as DbMessage[];
  }, [getOrCreateConversation]);

  // Task operations
  const addTask = useCallback(async (task: Omit<Task, "id">) => {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: task.title,
        client: task.client || null,
        completed: task.completed,
        priority: task.priority,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding task:", error);
      return;
    }

    setTasks((prev) => [
      {
        id: data.id,
        title: data.title,
        client: data.client || undefined,
        completed: data.completed,
        priority: data.priority as "low" | "medium" | "high",
      },
      ...prev,
    ]);
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const { error } = await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", id);

    if (error) {
      console.error("Error toggling task:", error);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, [tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("Error deleting task:", error);
      return;
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Appointment operations
  const addAppointment = useCallback(async (apt: Omit<Appointment, "id">) => {
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        title: apt.title,
        client: apt.client || null,
        date: apt.date.toISOString(),
        duration: apt.duration,
        location: apt.location || null,
        color: apt.color || "blue",
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding appointment:", error);
      return;
    }

    setAppointments((prev) =>
      [
        ...prev,
        {
          id: data.id,
          title: data.title,
          client: data.client || undefined,
          date: new Date(data.date),
          duration: data.duration,
          location: data.location || undefined,
          color: (data.color || "blue") as "blue" | "green" | "purple" | "orange",
        },
      ].sort((a, b) => a.date.getTime() - b.date.getTime())
    );
  }, []);

  const deleteAppointment = useCallback(async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);

    if (error) {
      console.error("Error deleting appointment:", error);
      return;
    }

    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Delete generated file
  const deleteGeneratedFile = useCallback(async (id: string) => {
    const { error } = await supabase.from("generated_files").delete().eq("id", id);

    if (error) {
      console.error("Error deleting file:", error);
      return;
    }

    setGeneratedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([
        loadTasks(),
        loadAppointments(),
        loadGeneratedFiles(),
        getOrCreateConversation(),
      ]);
      setIsLoading(false);
    };
    init();
  }, [loadTasks, loadAppointments, loadGeneratedFiles, getOrCreateConversation]);

  // Subscribe to realtime updates
  useEffect(() => {
    const tasksChannel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => loadTasks()
      )
      .subscribe();

    const appointmentsChannel = supabase
      .channel("appointments-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => loadAppointments()
      )
      .subscribe();

    const filesChannel = supabase
      .channel("files-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "generated_files" },
        () => loadGeneratedFiles()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(filesChannel);
    };
  }, [loadTasks, loadAppointments, loadGeneratedFiles]);

  return {
    conversationId,
    tasks,
    appointments,
    generatedFiles,
    isLoading,
    addTask,
    toggleTask,
    deleteTask,
    addAppointment,
    deleteAppointment,
    deleteGeneratedFile,
    saveMessage,
    loadConversationHistory,
    refreshTasks: loadTasks,
    refreshAppointments: loadAppointments,
    refreshFiles: loadGeneratedFiles,
  };
};
