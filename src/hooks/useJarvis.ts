import { useState, useCallback } from "react";
import { Message } from "@/components/jarvis/ChatMessage";
import { Task } from "@/components/jarvis/TaskList";
import { Appointment } from "@/components/jarvis/AppointmentWidget";
import { Language } from "@/hooks/useSpeech";

// Dummy AI responses for MVP
const dummyResponses = {
  en: [
    "I've noted that down! Is there anything else you'd like me to help with?",
    "Great question! Based on your schedule, I'd recommend tackling that tomorrow morning when you're most productive.",
    "I've checked your calendar and you have a free slot at 3 PM today. Would you like me to block that time?",
    "Sure thing! I'll add that to your task list with high priority.",
    "Looking at your upcoming appointments, you have a meeting with Sarah at 2 PM. Don't forget to prepare the quarterly report!",
    "I've analyzed your tasks and suggest focusing on the client proposal first—it has the nearest deadline.",
    "That's a great idea! I can help you draft an email for that. Just let me know the key points you'd like to cover.",
    "Based on your preferences, I'd recommend scheduling that call for late afternoon when your energy levels are typically higher.",
  ],
  it: [
    "Ho preso nota! C'è qualcos'altro in cui posso aiutarti?",
    "Ottima domanda! In base alla tua agenda, ti consiglio di affrontarlo domani mattina quando sei più produttivo.",
    "Ho controllato il tuo calendario e hai uno slot libero alle 15:00. Vuoi che blocchi quel tempo?",
    "Certo! Lo aggiungerò alla tua lista delle attività con priorità alta.",
    "Guardando i tuoi prossimi appuntamenti, hai una riunione con Sarah alle 14:00. Non dimenticare di preparare il report trimestrale!",
    "Ho analizzato i tuoi compiti e suggerisco di concentrarti prima sulla proposta del cliente—ha la scadenza più vicina.",
    "Ottima idea! Posso aiutarti a scrivere un'email per questo. Fammi sapere i punti chiave che vuoi includere.",
    "In base alle tue preferenze, ti consiglio di programmare quella chiamata nel tardo pomeriggio quando i tuoi livelli di energia sono tipicamente più alti.",
  ],
};

const welcomeMessages = {
  en: "Good morning! I'm Jarvis, your personal assistant. I've reviewed your schedule—you have 3 appointments today and 3 tasks pending. How can I help you?",
  it: "Buongiorno! Sono Jarvis, il tuo assistente personale. Ho controllato la tua agenda—hai 3 appuntamenti oggi e 3 attività in sospeso. Come posso aiutarti?",
};

const getRandomResponse = (lang: Language) => {
  const responses = dummyResponses[lang];
  return responses[Math.floor(Math.random() * responses.length)];
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

      // Simulate AI thinking time
      await new Promise((resolve) =>
        setTimeout(resolve, 800 + Math.random() * 1200)
      );

      const responseContent = getRandomResponse(lang);
      const assistantMessage: Message = {
        id: generateId(),
        content: responseContent,
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setLastAssistantMessage(responseContent);
      setIsLoading(false);
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
