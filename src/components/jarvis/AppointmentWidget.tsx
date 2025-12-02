import { useState } from "react";
import { Calendar, Clock, MapPin, Plus, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Language } from "@/hooks/useSpeech";

export interface Appointment {
  id: string;
  title: string;
  client: string;
  date: Date;
  duration: number; // minutes
  location?: string;
  color?: "blue" | "green" | "purple" | "orange";
}

interface AppointmentWidgetProps {
  appointments: Appointment[];
  onAdd: (apt: Omit<Appointment, "id">) => void;
  onDelete: (id: string) => void;
  language?: Language;
}

const colorVariants = {
  blue: "bg-primary/10 border-primary/20",
  green: "bg-emerald-500/10 border-emerald-500/20",
  purple: "bg-violet-500/10 border-violet-500/20",
  orange: "bg-orange-500/10 border-orange-500/20",
};

const dotVariants = {
  blue: "bg-primary",
  green: "bg-emerald-500",
  purple: "bg-violet-500",
  orange: "bg-orange-500",
};

const translations = {
  en: {
    upcoming: "Upcoming",
    noAppointments: "No appointments scheduled",
    addReminder: "Add reminder...",
    client: "Client/Description",
    dateTime: "Date & Time",
    location: "Location (optional)",
    add: "Add",
    cancel: "Cancel",
    today: "Today",
    tomorrow: "Tomorrow",
  },
  it: {
    upcoming: "In arrivo",
    noAppointments: "Nessun appuntamento programmato",
    addReminder: "Aggiungi promemoria...",
    client: "Cliente/Descrizione",
    dateTime: "Data e ora",
    location: "Luogo (opzionale)",
    add: "Aggiungi",
    cancel: "Annulla",
    today: "Oggi",
    tomorrow: "Domani",
  },
};

const colors: Array<"blue" | "green" | "purple" | "orange"> = [
  "blue",
  "green",
  "purple",
  "orange",
];

export const AppointmentWidget = ({
  appointments,
  onAdd,
  onDelete,
  language = "en",
}: AppointmentWidgetProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newColor, setNewColor] = useState<"blue" | "green" | "purple" | "orange">("blue");

  const t = translations[language];

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return t.today;
    if (date.toDateString() === tomorrow.toDateString()) return t.tomorrow;
    return date.toLocaleDateString(language === "it" ? "it-IT" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleAdd = () => {
    if (newTitle.trim() && newClient.trim() && newDate && newTime) {
      const dateTime = new Date(`${newDate}T${newTime}`);
      onAdd({
        title: newTitle.trim(),
        client: newClient.trim(),
        date: dateTime,
        duration: 30,
        location: newLocation.trim() || undefined,
        color: newColor,
      });
      resetForm();
    }
  };

  const resetForm = () => {
    setNewTitle("");
    setNewClient("");
    setNewDate("");
    setNewTime("");
    setNewLocation("");
    setNewColor("blue");
    setIsAdding(false);
  };

  return (
    <div className="glass rounded-2xl p-4 shadow-soft animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">{t.upcoming}</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="ml-auto w-6 h-6 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
        >
          {isAdding ? (
            <X className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Plus className="w-3.5 h-3.5 text-primary" />
          )}
        </button>
      </div>

      {/* Add Appointment Form */}
      {isAdding && (
        <div className="mb-4 p-3 rounded-xl bg-secondary/50 space-y-3 animate-scale-in">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t.addReminder}
            className="w-full bg-background/50 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            autoFocus
          />
          <input
            type="text"
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
            placeholder={t.client}
            className="w-full bg-background/50 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 bg-background/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-24 bg-background/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <input
            type="text"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder={t.location}
            className="w-full bg-background/50 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Color:</span>
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={cn(
                  "w-6 h-6 rounded-full transition-all",
                  dotVariants[c],
                  newColor === c ? "ring-2 ring-offset-2 ring-primary" : "opacity-50 hover:opacity-100"
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim() || !newClient.trim() || !newDate || !newTime}
              className="flex-1 text-xs py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {t.add}
            </button>
            <button
              onClick={resetForm}
              className="text-xs px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {appointments.length === 0 && !isAdding ? (
        <p className="text-sm text-muted-foreground">{t.noAppointments}</p>
      ) : (
        <div className="space-y-3">
          {appointments.slice(0, 3).map((apt, index) => (
            <div
              key={apt.id}
              className={cn(
                "group rounded-xl p-3 border transition-all animate-slide-up relative",
                colorVariants[apt.color || "blue"]
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <button
                onClick={() => onDelete(apt.id)}
                className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                    dotVariants[apt.color || "blue"]
                  )}
                />
                <div className="flex-1 min-w-0 pr-6">
                  <h4 className="text-sm font-medium truncate">{apt.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {apt.client}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(apt.date)}, {formatTime(apt.date)}
                    </span>
                    {apt.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3" />
                        {apt.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
