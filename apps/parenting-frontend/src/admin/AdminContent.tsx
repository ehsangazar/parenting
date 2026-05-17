import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api.js';
import { useAuth } from '../state/auth.js';

interface Document {
  id: string;
  title: string;
  docType: string;
  source: string;
  s3Key?: string;
  mime?: string;
  createdAt: string;
}

export const AdminContent = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/documents', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      setDocuments(res.data.documents || []);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const downloadDocument = async (doc: Document) => {
    if (!doc.s3Key) {
      toast.error('Document has no file to download');
      return;
    }

    setDownloading(doc.id);
    try {
      const res = await api.get(`/api/admin/documents/${doc.id}/download`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      
      const downloadUrl = res.data.url;
      
      // Determine file extension from mime type or use default
      let extension = '';
      if (doc.mime) {
        if (doc.mime === 'application/pdf') extension = '.pdf';
        else if (doc.mime === 'text/plain') extension = '.txt';
        else if (doc.mime === 'text/markdown') extension = '.md';
        else if (doc.mime.includes('text/')) extension = '.txt';
      }
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${doc.title}${extension}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download document');
    } finally {
      setDownloading(null);
    }
  };

  const deleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await api.delete(`/api/admin/documents/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      toast.success('Document deleted successfully');
      loadDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  useEffect(() => {
    if (token) loadDocuments();
  }, [token, loadDocuments]);

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-brand-blue/40 bg-brand-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-blue">
              Content Library
            </div>
            <h1 className="text-3xl font-black tracking-tight text-text-primary mb-2">Manage Content</h1>
            <p className="text-text-secondary font-medium">View and manage all uploaded documents</p>
          </div>
          <button
            onClick={loadDocuments}
            className="btn-duo-blue-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <div className="bg-surface rounded-3xl shadow-sm border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-text-tertiary">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-sm mt-1">Upload some content to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-light border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Source</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-surface-light transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-text-primary">{doc.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg">
                          {doc.docType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{doc.source || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {doc.s3Key && (
                            <button
                              onClick={() => downloadDocument(doc)}
                              disabled={downloading === doc.id}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-brand-blue rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              {downloading === doc.id ? (
                                <>
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span>Downloading...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  <span>Download</span>
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className="px-3 py-1.5 bg-error/10 hover:bg-red-100 text-error600 rounded-lg text-sm font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
