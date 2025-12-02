import { useState, useCallback } from "react";
import { Message } from "@/components/jarvis/ChatMessage";
import { Task } from "@/components/jarvis/TaskList";
import { Appointment } from "@/components/jarvis/AppointmentWidget";

// Dummy AI responses for MVP
const dummyResponses = [
  "I've noted that down! Is there anything else you'd like me to help with?",
  "Great question! Based on your schedule, I'd recommend tackling that tomorrow morning when you're most productive.",
  "I've checked your calendar and you have a free slot at 3 PM today. Would you like me to block that time?",
  "Sure thing! I'll add that to your task list with high priority.",
  "Looking at your upcoming appointments, you have a meeting with Sarah at 2 PM. Don't forget to prepare the quarterly report!",
  "I've analyzed your tasks and suggest focusing on the client proposal first—it has the nearest deadline.",
  "That's a great idea! I can help you draft an email for that. Just let me know the key points you'd like to cover.",
  "Based on your preferences, I'd recommend scheduling that call for late afternoon when your energy levels are typically higher.",
];

const getRandomResponse = () =>
  dummyResponses[Math.floor(Math.random() * dummyResponses.length)];

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

export const useJarvis = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content:
        "Good morning! I'm Jarvis, your personal assistant. I've reviewed your schedule—you have 3 appointments today and 3 tasks pending. How can I help you?",
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [appointments] = useState<Appointment[]>(initialAppointments);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: generateId(),
      content,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI thinking time
    await new Promise((resolve) =>
      setTimeout(resolve, 800 + Math.random() * 1200)
    );

    const assistantMessage: Message = {
      id: generateId(),
      content: getRandomResponse(),
      role: "assistant",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    tasks,
    toggleTask,
    appointments,
  };
};
