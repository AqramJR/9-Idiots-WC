interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = '⚽', title, message, action }: EmptyStateProps) {
  return (
    <div className="glass-card flex flex-col items-center gap-3 px-6 py-16 text-center animate-fade-up">
      <span className="text-5xl opacity-80">{icon}</span>
      <h3 className="font-display text-xl font-semibold text-chalk-100">{title}</h3>
      {message && <p className="max-w-sm text-sm text-chalk-500">{message}</p>}
      {action}
    </div>
  );
}
