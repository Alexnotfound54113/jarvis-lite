import { useState, useCallback, useRef } from "react";
import { Message } from "@/components/jarvis/ChatMessage";
import { Task } from "@/components/jarvis/TaskList";
import { Appointment } from "@/components/jarvis/AppointmentWidget";
import { Language } from "@/hooks/useSpeech";
import { sendMessageToAI, ChatMessage } from "@/lib/openai";

const welcomeMessages = {
  en: "Good morning! I'm Jarvis, your personal assistant. I've reviewed your schedule—you have 3 appointments today and 3 tasks pending. How can I help you?",
  it: "Buongiorno! Sono Jarvis, il tuo assistente personale. Ho controllato la tua agenda—hai 3 appuntamenti oggi e 3 attività in sospeso. Come posso aiutarti?",
};


const generateId = () => Math.random().toString(36).substring(2, 9);

// Initial dummy data
const initialAppointments: Appointment[] = [
  {
    id: "1",
    title: "Project Review",
    client: "Sarah Chen",
    date: new Date(Date.now() + 2 * 60 * 60 * 1000),
    duration: 45,
    location: "Zoom",
    color: "blue",
  },
  {
    id: "2",
    title: "Strategy Call",
    client: "Michael Ross",
    date: new Date(Date.now() + 24 * 60 * 60 * 1000),
    duration: 30,
    color: "green",
  },
  {
    id: "3",
    title: "Quarterly Planning",
    client: "Tech Solutions Inc.",
    date: new Date(Date.now() + 48 * 60 * 60 * 1000),
    duration: 60,
    location: "Conference Room A",
    color: "purple",
  },
];

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Prepare quarterly report",
    client: "Tech Solutions Inc.",
    completed: false,
    priority: "high",
  },
  {
    id: "2",
    title: "Review contract draft",
    client: "Sarah Chen",
    completed: false,
    priority: "medium",
  },
  {
    id: "3",
    title: "Send follow-up email",
    client: "Michael Ross",
    completed: false,
    priority: "low",
  },
  {
    id: "4",
    title: "Update project timeline",
    completed: true,
    priority: "medium",
  },
];

export const useJarvis = (language: Language) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: welcomeMessages[language],
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [lastAssistantMessage, setLastAssistantMessage] = useState<string | null>(null);
  const conversationHistoryRef = useRef<ChatMessage[]>([]);

  // Update welcome message when language changes
  const updateWelcomeMessage = useCallback((lang: Language) => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === "welcome") {
        return [
          {
            ...prev[0],
            content: welcomeMessages[lang],
          },
        ];
      }
      return prev;
    });
  }, []);

  const sendMessage = useCallback(
    async (content: string, lang: Language) => {
      const userMessage: Message = {
        id: generateId(),
        content,
        role: "user",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setLastAssistantMessage(null);

      try {
        const responseContent = await sendMessageToAI(
          content,
          lang,
          conversationHistoryRef.current
        );

        // Update conversation history
        conversationHistoryRef.current.push(
          { role: "user", content },
          { role: "assistant", content: responseContent }
        );

        const assistantMessage: Message = {
          id: generateId(),
          content: responseContent,
          role: "assistant",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setLastAssistantMessage(responseContent);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Sorry, I couldn't reach the server. Try again?";
        const assistantMessage: Message = {
          id: generateId(),
          content: errorMessage,
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLastAssistantMessage(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }, []);

  const addTask = useCallback((task: Omit<Task, "id">) => {
    const newTask: Task = {
      ...task,
      id: generateId(),
    };
    setTasks((prev) => [newTask, ...prev]);
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const addAppointment = useCallback((apt: Omit<Appointment, "id">) => {
    const newApt: Appointment = {
      ...apt,
      id: generateId(),
    };
    setAppointments((prev) => [...prev, newApt].sort((a, b) => a.date.getTime() - b.date.getTime()));
  }, []);

  const deleteAppointment = useCallback((id: string) => {
    setAppointments((prev) => prev.filter((apt) => apt.id !== id));
  }, []);

  const addVoiceExchange = useCallback(
    (userText: string, assistantText: string) => {
      const userMessage: Message = {
        id: generateId(),
        content: userText,
        role: "user",
        timestamp: new Date(),
      };
      const assistantMessage: Message = {
        id: generateId(),
        content: assistantText,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
    },
    []
  );

  return {
    messages,
    isLoading,
    sendMessage,
    tasks,
    toggleTask,
    addTask,
    deleteTask,
    appointments,
    addAppointment,
    deleteAppointment,
    lastAssistantMessage,
    updateWelcomeMessage,
    addVoiceExchange,
  };
};
