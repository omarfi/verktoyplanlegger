import type { ToolStatus } from '../types';
import { getStatusLabel, getStatusColor } from '../logic';

export function StatusBadge({ status }: { status: ToolStatus }) {
  const label = getStatusLabel(status);
  const color = getStatusColor(status);
  return (
    <span className="status-badge" style={{ background: color.bg, color: color.text }}>
      {label}
    </span>
  );
}
