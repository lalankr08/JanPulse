'use client';

import React, { useState, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { createRunStream, extractDocumentText } from '@/lib/api';
import { addLocalHistoryItem } from '@/lib/historyStore';
import { 
  FileText, Calendar, Users, AlertTriangle, CheckSquare, 
  ArrowRight, Loader2, Link2, ExternalLink, ShieldCheck, Clock,
  Upload, X, CheckCircle2, FileCode, Check, ChevronDown, ChevronUp
} from 'lucide-react';

export default function ExplainNotificationPage() {
  const [language, setLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [urlOrText, setUrlOrText] = useState('');
  
  // Document Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [extractedDocText, setExtractedDocText] = useState<string>('');
  const [docMeta, setDocMeta] = useState<{ pages: number; word_count: number; doc_type: string } | null>(null);
  const [showPreviewText, setShowPreviewText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Execution State
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepMessage, setCurrentStepMessage] = useState<string>('');
  const [result, setResult] = useState<any>(null);

  // Handle Document Selection and Python Extraction
  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsExtractingDoc(true);
    setExtractedDocText('');
    setDocMeta(null);
    setResult(null);

    try {
      const data = await extractDocumentText(file);
      if (data && data.status === 'success') {
        setExtractedDocText(data.text);
        setDocMeta({
          pages: data.pages || 1,
          word_count: data.word_count || 0,
          doc_type: data.doc_type || 'document'
        });
      } else {
        alert(data?.message || 'Could not extract text from document. Please review file format.');
      }
    } catch (err: any) {
      console.error('Document extraction error:', err);
      alert(`Text extraction failed: ${err.message}`);
    } finally {
      setIsExtractingDoc(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setExtractedDocText('');
    setDocMeta(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExplain = async () => {
    const textToExplain = activeTab === 'upload' ? extractedDocText : urlOrText;
    if (!textToExplain.trim()) {
      alert(activeTab === 'upload' ? 'Please upload a PDF or DOC file first.' : 'Please enter a notification URL or paste text.');
      return;
    }

    setIsLoading(true);
    setResult(null);
    setCurrentStepMessage('Parsing gazette order and regulatory text...');

    try {
      await createRunStream(
        textToExplain,
        'notification',
        language,
        (event) => {
          if (event.type === 'step_start') {
            setCurrentStepMessage(event.message || 'Analyzing policy changes...');
          } else if (event.type === 'notification_result') {
            setResult(event);
            setIsLoading(false);
            setCurrentStepMessage('');

            const queryLabel = selectedFile ? selectedFile.name : (urlOrText.length > 60 ? `${urlOrText.slice(0, 60)}...` : urlOrText);
            addLocalHistoryItem({
              query: queryLabel,
              kind: 'notification',
              label: event.title || 'Official Gazette / Order',
              explanation: event.what_changes?.[0] || 'Official regulatory breakdown'
            }, Boolean(event.saved_to_cloud));
          }
        },
        (err) => {
          alert(`Explanation failed: ${err.message}`);
          setIsLoading(false);
          setCurrentStepMessage('');
        }
      );
    } catch (e: any) {
      alert(e.message);
      setIsLoading(false);
      setCurrentStepMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Apple Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-xs font-semibold mb-4 tracking-tight">
            <FileText className="w-3.5 h-3.5" />
            <span>e-Gazette & Regulatory Digest</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight leading-[1.15] mb-4">
            Demystify government circulars & gazettes.
          </h1>
          <p className="text-[#6E6E73] text-base sm:text-lg leading-relaxed font-normal">
            Upload an official gazette PDF, Word document, or paste a government notice link to get an instant breakdown of who is affected, key deadlines, and next steps.
          </p>
        </div>

        {/* Input Bento Card */}
        <div className="bg-white rounded-3xl border border-black/[0.06] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] mb-8">
          {/* Segmented Pill Navigation */}
          <div className="flex items-center justify-center sm:justify-start mb-6">
            <div className="bg-[#E5E5EA]/70 p-1 rounded-full flex gap-1 text-xs font-semibold border border-black/[0.04]">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${
                  activeTab === 'upload'
                    ? 'bg-white text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PDF / Word</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${
                  activeTab === 'paste'
                    ? 'bg-white text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Paste Link / Text</span>
              </button>
            </div>
          </div>

          {/* Upload Tab View */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {selectedFile ? (
                <div className="border border-black/[0.06] bg-[#F5F5F7] rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1D1D1F] truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-[#86868B] font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.name.split('.').pop()?.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 text-[#86868B] hover:text-[#FF3B30] hover:bg-black/[0.04] rounded-full transition-colors shrink-0"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Extraction Status */}
                  {isExtractingDoc ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#0071E3] bg-white p-3 rounded-xl border border-black/[0.04] mt-3 animate-fadeIn">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Parsing document with Python pypdf & docx parsers...</span>
                    </div>
                  ) : docMeta ? (
                    <div className="space-y-3 mt-3">
                      <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-black/[0.04] text-xs font-medium text-[#248A3D]">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Extracted successfully • {docMeta.pages} page(s) • {docMeta.word_count.toLocaleString()} words</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPreviewText(!showPreviewText)}
                          className="text-[#0071E3] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>{showPreviewText ? 'Hide text' : 'Inspect text'}</span>
                          {showPreviewText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Collapsible Text Preview */}
                      {showPreviewText && (
                        <div className="bg-white p-4 rounded-xl border border-black/[0.04] max-h-48 overflow-y-auto text-xs text-[#1D1D1F] font-mono leading-relaxed whitespace-pre-wrap animate-fadeIn">
                          {extractedDocText.slice(0, 2000)}
                          {extractedDocText.length > 2000 && "\n\n[... Remaining content parsed and ready for analysis ...]"}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-black/[0.1] hover:border-[#0071E3] transition-colors rounded-2xl p-8 text-center bg-[#F5F5F7]/50 hover:bg-[#F5F5F7] cursor-pointer group"
                >
                  <Upload className="w-8 h-8 mx-auto text-[#86868B] group-hover:text-[#0071E3] transition-colors mb-2.5" />
                  <p className="text-sm font-semibold text-[#1D1D1F]">
                    Upload Official Gazette, Notification, or Circular
                  </p>
                  <p className="text-xs text-[#86868B] mt-1">
                    Supports PDF (.pdf), Microsoft Word (.docx, .doc), or Text files.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <span className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-black/[0.06] rounded-md text-[#6E6E73]">
                      .PDF
                    </span>
                    <span className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-black/[0.06] rounded-md text-[#6E6E73]">
                      .DOCX / .DOC
                    </span>
                    <span className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-black/[0.06] rounded-md text-[#6E6E73]">
                      .TXT
                    </span>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
          )}

          {/* Paste Tab View */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#86868B] uppercase tracking-wider mb-2">
                  Official Notification URL or Text
                </label>
                <textarea
                  rows={4}
                  value={urlOrText}
                  onChange={(e) => setUrlOrText(e.target.value)}
                  placeholder="https://egazette.gov.in/... or paste legal notification text directly"
                  className="w-full bg-[#F5F5F7]/60 hover:bg-[#F5F5F7] focus:bg-white border border-transparent focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/15 rounded-2xl p-4 text-sm sm:text-base text-[#1D1D1F] placeholder-[#86868B] outline-none transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 mt-4 border-t border-black/[0.06]">
            <span className="text-xs text-[#86868B] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0071E3]" />
              <span>Parsed locally using Python pypdf & docx with zero external data sharing.</span>
            </span>

            <button
              type="button"
              onClick={handleExplain}
              disabled={isLoading || isExtractingDoc || (activeTab === 'upload' ? !extractedDocText.trim() : !urlOrText.trim())}
              className="w-full sm:w-auto px-7 py-3 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(0,113,227,0.28)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Gazette...</span>
                </>
              ) : (
                <>
                  <span>Explain Gazette & Circular</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Processing Card */}
        {isLoading && (
          <div className="bg-white border border-black/[0.06] rounded-2xl p-5 mb-8 flex items-center gap-3.5 shadow-sm animate-fadeIn">
            <div className="w-8 h-8 rounded-full bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1D1D1F] truncate">{currentStepMessage}</p>
              <p className="text-xs text-[#86868B]">Extracting who is affected, legal changes, deadlines, and mandatory citizen actions.</p>
            </div>
          </div>
        )}

        {/* Results Bento Grid */}
        {result && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <div className="border-b border-black/[0.06] pb-5 mb-6">
                <span className="text-xs font-semibold text-[#0071E3] uppercase tracking-wider">
                  Plain-Language Summary
                </span>
                <h2 className="text-2xl font-bold text-[#1D1D1F] mt-1 tracking-tight">
                  {result.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#86868B] mt-2.5">
                  <span className="bg-black/[0.04] px-2.5 py-0.5 rounded-full font-medium">
                    Source: {result.publisher || (selectedFile ? selectedFile.name : 'The Gazette of India')}
                  </span>
                  {result.effective_date && (
                    <span className="flex items-center gap-1 font-semibold text-[#1D1D1F] bg-[#0071E3]/10 text-[#0071E3] px-2.5 py-0.5 rounded-full">
                      <Calendar className="w-3.5 h-3.5" />
                      Effective Date: {result.effective_date}
                    </span>
                  )}
                </div>
              </div>

              {/* Bento breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {/* Who is affected */}
                <div className="bg-[#F5F5F7] border border-black/[0.04] rounded-2xl p-5">
                  <h3 className="font-semibold text-sm text-[#1D1D1F] mb-2.5 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0071E3]" />
                    <span>Who is affected:</span>
                  </h3>
                  <ul className="list-disc list-inside text-xs text-[#6E6E73] space-y-1.5 leading-relaxed">
                    {result.who_is_affected?.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>

                {/* What changes */}
                <div className="bg-[#F5F5F7] border border-black/[0.04] rounded-2xl p-5">
                  <h3 className="font-semibold text-sm text-[#1D1D1F] mb-2.5 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0071E3]" />
                    <span>What changes:</span>
                  </h3>
                  <ul className="list-disc list-inside text-xs text-[#6E6E73] space-y-1.5 leading-relaxed">
                    {result.what_changes?.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Deadlines & Penalties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {result.deadlines && result.deadlines.length > 0 && (
                  <div className="bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-2xl p-5 text-[#B25000]">
                    <h3 className="font-semibold text-sm mb-2.5 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Deadlines & Milestones:</span>
                    </h3>
                    <ul className="list-disc list-inside text-xs space-y-1.5 leading-relaxed">
                      {result.deadlines.map((d: string, i: number) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.penalties_or_actions && result.penalties_or_actions.length > 0 && (
                  <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-2xl p-5 text-[#D70015]">
                    <h3 className="font-semibold text-sm mb-2.5 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Penalties or Consequences:</span>
                    </h3>
                    <ul className="list-disc list-inside text-xs space-y-1.5 leading-relaxed">
                      {result.penalties_or_actions.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action items */}
              {result.what_to_do_next && result.what_to_do_next.length > 0 && (
                <div className="bg-[#34C759]/10 border border-[#34C759]/20 rounded-2xl p-5 text-[#248A3D]">
                  <h3 className="font-semibold text-sm mb-2.5 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    <span>What to do next:</span>
                  </h3>
                  <ol className="list-decimal list-inside text-xs space-y-1.5 leading-relaxed">
                    {result.what_to_do_next.map((act: string, i: number) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
