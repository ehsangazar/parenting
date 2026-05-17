import { useState } from 'react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { api } from '../lib/api.js';
import { useAuth } from '../state/auth.js';

export const AdminUpload = () => {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('Expert');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('file');
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setContent('');
      setUploadMode('file');
    }
  };

  const upload = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setUploading(true);
    try {
      let fileToUpload: File | Blob | null = null;
      let mimeType = 'text/plain';
      let fileSize = 0;

      if (uploadMode === 'file' && selectedFile) {
        mimeType = selectedFile.type || 'application/pdf';
        fileSize = selectedFile.size;
        fileToUpload = selectedFile;
      } else {
        if (!content.trim()) {
          toast.error('Please enter content or select a file');
          setUploading(false);
          return;
        }
        const textBlob = new Blob([content], { type: 'text/plain' });
        fileSize = textBlob.size;
        fileToUpload = textBlob;
      }

      if (!fileToUpload) {
        toast.error('No file selected or content provided');
        setUploading(false);
        return;
      }

      // Get presigned URL
      const presign = await api.post(
        '/api/admin/presign',
        { contentType: mimeType, contentLength: fileSize },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );

      // Upload to S3
      await fetch(presign.data.url, {
        method: 'PUT',
        body: fileToUpload,
        headers: {
          'Content-Type': mimeType,
        },
      });

      // Always create metadata without ingesting
      await api.post(
        '/api/admin/documents',
        {
          title,
          docType,
          source: 'admin-upload',
          s3Key: presign.data.key,
          mime: mimeType,
          size: fileSize,
          locale: 'en',
        },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      toast.success('Document uploaded; ingestion pending');

      setTitle('');
      setContent('');
      setSelectedFile(null);
      const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-sm">
          <div className="mb-2 inline-flex rounded-full border border-brand-blue/40 bg-brand-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-blue">
            Knowledge Base
          </div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary mb-2">Upload Content</h1>
          <p className="text-text-secondary font-medium">Add new educational content to the knowledge base</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface rounded-3xl shadow-sm p-6 border border-border">
              <h2 className="text-lg font-semibold text-text-primary mb-5 flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Document Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Title *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-surface border border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-text-tertiary"
                    placeholder="e.g., Introduction to Machine Learning"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Document Type *</label>
                  <select
                    className="w-full px-4 py-2.5 bg-surface border border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  >
                    <option value="Expert">🩺 Expert source (research, guides, books)</option>
                    <option value="Experience">👩‍👧 Community experience (stories, peer advice)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-3xl shadow-sm p-6 border border-border">
              <h2 className="text-lg font-semibold text-text-primary mb-5 flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Upload Method
              </h2>
              
              <div className="flex gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode('file');
                    setContent('');
                  }}
                  className={clsx(
                    'flex-1 px-4 py-3 rounded-lg font-medium transition-all border-2',
                    uploadMode === 'file'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-surface border-border text-text-secondary hover:border-border-dark'
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload File
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode('text');
                    setSelectedFile(null);
                    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
                    if (fileInput) fileInput.value = '';
                  }}
                  className={clsx(
                    'flex-1 px-4 py-3 rounded-lg font-medium transition-all border-2',
                    uploadMode === 'text'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-surface border-border text-text-secondary hover:border-border-dark'
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Paste Text
                  </div>
                </button>
              </div>

              {uploadMode === 'file' ? (
                <div>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full min-h-[280px] border-2 border-dashed border-border-dark rounded-lg cursor-pointer bg-surface-light hover:bg-surface hover:border-blue-400 transition-all group"
                  >
                    {selectedFile ? (
                      <div className="flex flex-col items-center p-8">
                        <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-200 transition-colors">
                          <svg className="w-10 h-10 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-base font-semibold text-text-primary mb-2">{selectedFile.name}</p>
                        <p className="text-sm text-text-secondary mb-4">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                        <div className="flex items-center gap-2 text-brand-blue font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Click to change file
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center p-8 text-center">
                        <div className="w-20 h-20 bg-surface-light rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-50 transition-colors">
                          <svg className="w-10 h-10 text-text-tertiary group-hover:text-brand-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-base font-semibold text-text-primary mb-2">Drop your file here or click to browse</p>
                        <p className="text-sm text-text-secondary mb-1">Supports: PDF, TXT, Markdown</p>
                        <p className="text-xs text-text-tertiary">Maximum file size: 50 MB</p>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                <div>
                  <textarea
                    className="w-full px-4 py-3 bg-surface border-2 border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-text-tertiary min-h-[280px] font-mono text-sm"
                    placeholder="Paste your content here...&#10;&#10;You can paste text, markdown, or any educational content."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>
              )}
            </div>

            <button
              onClick={upload}
              disabled={uploading || !title.trim() || (uploadMode === 'file' && !selectedFile) || (uploadMode === 'text' && !content.trim())}
              className="btn-duo-blue flex w-full items-center justify-center gap-2 !min-h-14 !rounded-xl !px-6 !py-4 !font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <span className="w-5 h-5 border-2 border-border border-t-transparent rounded-full animate-spin"></span>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Upload</span>
                </>
              )}
            </button>
          </div>

          {/* Sidebar - Tips & Info */}
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">Upload Tips</h3>
                  <ul className="text-sm text-text-secondary space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-brand-blue mt-0.5">•</span>
                      <span>Use descriptive titles for better searchability</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-blue mt-0.5">•</span>
                      <span>Select the correct document type</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-blue mt-0.5">•</span>
                      <span>PDFs are automatically processed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-blue mt-0.5">•</span>
                      <span>Content is chunked for optimal retrieval</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm">
              <h3 className="font-semibold text-text-primary mb-3">Supported Formats</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 bg-surface-light rounded-lg">
                  <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-text-primary">PDF Documents</p>
                    <p className="text-xs text-text-secondary">.pdf</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-surface-light rounded-lg">
                  <svg className="w-5 h-5 text-text-secondary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Text Files</p>
                    <p className="text-xs text-text-secondary">.txt</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-surface-light rounded-lg">
                  <svg className="w-5 h-5 text-brand-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Markdown</p>
                    <p className="text-xs text-text-secondary">.md</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
