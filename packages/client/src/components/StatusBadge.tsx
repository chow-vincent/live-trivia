const styles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  lobby: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  grading: 'bg-green-100 text-green-700',
  leaderboard: 'bg-green-100 text-green-700',
  finished: 'bg-slate-100 text-slate-500',
};

const labels: Record<string, string> = {
  draft: 'Draft',
  lobby: 'Lobby',
  active: 'Active',
  grading: 'Active',
  leaderboard: 'Active',
  finished: 'Finished',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}
