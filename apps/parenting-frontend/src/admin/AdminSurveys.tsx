import { useState, useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api.js';
import { Drawer } from '../components/Drawer.js';

type SurveyRecord = { id: string; createdAt: string; responses: Record<string, unknown> };

/** Fetches presigned URL and renders audio player (S3 objects are private by default). */
function AdminAudioPlayer({ src }: { src: string }) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ url: string }>(`/api/admin/presign-audio?url=${encodeURIComponent(src)}`)
      .then((res) => {
        if (!cancelled) setPlayUrl(res.data.url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (error) {
    return (
      <p className="text-sm text-text-tertiary">
        Playback restricted. <a href={src} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">Open URL</a>
      </p>
    );
  }
  if (!playUrl) {
    return <p className="text-sm text-text-tertiary">Loading…</p>;
  }
  return <audio src={playUrl} controls className="w-full h-10" />;
}

function formatResponseKey(key: string): string {
  const match = key.match(/^q(\d+)_?(.+)$/);
  if (match) {
    const rest = (match[2] ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    return rest ? `${match[1]}. ${rest}` : `${match[1]}`;
  }
  return key.replace(/_/g, ' ');
}

/** Sort by question number (q1, q2, … q10) then by key. */
function sortResponseEntries([a]: [string, unknown], [b]: [string, unknown]): number {
  const numA = parseInt(a.match(/^q(\d+)/)?.[1] ?? '0', 10);
  const numB = parseInt(b.match(/^q(\d+)/)?.[1] ?? '0', 10);
  if (numA !== numB) return numA - numB;
  return a.localeCompare(b);
}

function formatResponseValue(v: unknown): string | ReactElement {
  if (v === undefined || v === null) return '—';
  if (Array.isArray(v)) return (v as unknown[]).map(String).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function isAudioUrl(key: string, value: unknown): boolean {
  return (
    typeof value === 'string' &&
    key.endsWith('_audio') &&
    (value.startsWith('http://') || value.startsWith('https://'))
  );
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function valueToCsv(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return (v as unknown[]).map(String).join('; ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function buildCsv(responses: SurveyRecord[]): string {
  const allKeys = new Set<string>();
  responses.forEach((r) => Object.keys(r.responses || {}).forEach((k) => allKeys.add(k)));
  const keys = Array.from(allKeys).sort();
  const header = ['id', 'createdAt', ...keys];
  const rows = responses.map((r) => {
    const res = r.responses || {};
    return [
      r.id,
      r.createdAt,
      ...keys.map((k) => valueToCsv(res[k])),
    ];
  });
  const lines = [header.map(escapeCsvCell).join(',')];
  rows.forEach((row) => lines.push(row.map(escapeCsvCell).join(',')));
  return lines.join('\r\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export const AdminSurveys = () => {
  const [responses, setResponses] = useState<SurveyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SurveyRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ responses: SurveyRecord[] }>('/api/admin/surveys');
      setResponses(res.data.responses || []);
    } catch {
      toast.error('Failed to load survey responses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this survey response? This cannot be undone.')) return;
    try {
      await api.delete(`/api/admin/surveys/${id}`);
      toast.success('Response deleted');
      load();
    } catch {
      toast.error('Failed to delete response');
    }
  };

  const handleExportCsv = () => {
    if (responses.length === 0) {
      toast.error('No responses to export');
      return;
    }
    const csv = buildCsv(responses);
    const filename = `raised-survey-responses-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(csv, filename);
    toast.success(`Exported ${responses.length} response(s)`);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-700">
              Insights & Research
            </div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black tracking-tight text-text-primary">Survey Responses</h1>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-700">
                {loading ? '…' : responses.length} response{responses.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-text-secondary font-medium">View, export, and manage survey submissions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={loading || responses.length === 0}
              className="btn-duo-green-sm !font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              type="button"
              onClick={load}
              className="px-4 py-2.5 border-2 border-border-medium text-text-primary rounded-xl font-medium hover:bg-primary-50 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357 2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-surface rounded-3xl shadow-sm border border-border-light overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center py-12 text-text-tertiary">
              <p className="text-lg font-medium">No survey responses yet</p>
              <p className="text-sm mt-1">Responses will appear here when users complete the survey.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary-50 border-b border-border-light">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">Preview</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-primary-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {responses.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-primary-50/50 transition-colors cursor-pointer"
                      onClick={() => setSelected(r)}
                    >
                      <td className="px-6 py-4 font-mono text-sm text-text-secondary">
                        {r.id.slice(0, 8)}…
                      </td>
                      <td className="px-6 py-4 text-sm text-text-primary">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate">
                        {r.responses && typeof r.responses === 'object'
                          ? (() => {
                              const res = r.responses as Record<string, unknown>;
                              const v = res.q1_familyStructure ?? res.q23_email ?? res.q2_children ?? Object.values(res)[0];
                              if (v == null) return '—';
                              if (Array.isArray(v)) return (v as unknown[]).slice(0, 2).join(', ') + (v.length > 2 ? '…' : '');
                              return String(v).slice(0, 50) + (String(v).length > 50 ? '…' : '');
                            })()
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          className="px-3 py-1.5 bg-error/10 hover:bg-error/20 text-error rounded-lg text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Drawer
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected ? `Response · ${selected.createdAt ? new Date(selected.createdAt).toLocaleString() : selected.id.slice(0, 8)}` : 'Survey answers'}
      >
        {selected && selected.responses && typeof selected.responses === 'object' ? (
          <dl className="space-y-4">
            {Object.entries(selected.responses as Record<string, unknown>)
              .filter(([, v]) => v !== undefined && v !== null && v !== '')
              .sort(sortResponseEntries)
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm font-medium text-text-secondary mb-1">{formatResponseKey(key)}</dt>
                  <dd className="text-text-primary text-sm whitespace-pre-wrap break-words">
                    {isAudioUrl(key, value) ? (
                      <div className="mt-2 p-3 rounded-lg bg-primary-50 border border-primary-200">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-medium text-primary-700">Voice Recording</span>
                        </div>
                        <AdminAudioPlayer src={String(value)} />
                      </div>
                    ) : (
                      formatResponseValue(value)
                    )}
                  </dd>
                </div>
              ))}
          </dl>
        ) : (
          <p className="text-text-tertiary text-sm">No answers recorded.</p>
        )}
      </Drawer>
    </div>
  );
};
