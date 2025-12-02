export const TypingIndicator = () => {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="glass rounded-2xl rounded-bl-md px-4 py-3 shadow-soft">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full bg-primary/60 animate-typing-dot"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-primary/60 animate-typing-dot"
            style={{ animationDelay: "200ms" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-primary/60 animate-typing-dot"
            style={{ animationDelay: "400ms" }}
          />
        </div>
      </div>
    </div>
  );
};
