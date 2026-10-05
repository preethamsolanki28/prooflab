/**
 * Dynamic viewer-specific watermark generator for confidential brief inspection.
 * Format: USER_NAME · PROJECT_ID_SHORT · HH:MM
 */
export function generateWatermark(viewerName: string, projectId: string, date: Date = new Date()): string {
  const code = (projectId || "").slice(0, 8).toUpperCase();
  const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${(viewerName || "UNKNOWN").toUpperCase()} · ${code} · ${timeStr}`;
}
