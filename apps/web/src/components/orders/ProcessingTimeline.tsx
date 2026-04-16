import { Badge } from '@/components/ui/badge';
import type { SyncLog, SyncStatus } from '@repo/types';

const statusColor: Record<SyncStatus, string> = {
  SUCCESS: 'bg-green-500',
  FAILURE: 'bg-red-500',
  PENDING: 'bg-yellow-500',
};

const statusVariant: Record<SyncStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SUCCESS: 'default',
  FAILURE: 'destructive',
  PENDING: 'outline',
};

export function ProcessingTimeline({ logs }: { logs: SyncLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No processing history yet.</p>;
  }

  return (
    <ol className="relative border-l border-border ml-3">
      {logs.map((log, i) => (
        <li key={log.id} className={`mb-6 ml-6 ${i === logs.length - 1 ? 'mb-0' : ''}`}>
          <span
            className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background ${statusColor[log.status]}`}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{log.eventType}</p>
            <Badge variant={statusVariant[log.status]} className="text-xs">
              {log.status}
            </Badge>
            {log.durationMs && (
              <span className="text-xs text-muted-foreground">{log.durationMs}ms</span>
            )}
          </div>
          <time className="text-xs text-muted-foreground">
            {new Date(log.createdAt).toLocaleString()}
          </time>
          {log.errorMessage && (
            <p className="mt-1 text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
              {log.errorMessage}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
