import { Calendar, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

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

export const AppointmentWidget = ({ appointments }: AppointmentWidgetProps) => {
  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  if (appointments.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 shadow-soft animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Upcoming</h3>
        </div>
        <p className="text-sm text-muted-foreground">No appointments scheduled</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 shadow-soft animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Upcoming</h3>
      </div>

      <div className="space-y-3">
        {appointments.slice(0, 3).map((apt, index) => (
          <div
            key={apt.id}
            className={cn(
              "rounded-xl p-3 border transition-all animate-slide-up",
              colorVariants[apt.color || "blue"]
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                  dotVariants[apt.color || "blue"]
                )}
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{apt.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{apt.client}</p>
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
    </div>
  );
};
