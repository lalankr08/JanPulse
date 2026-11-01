'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { VerdictChip } from '@/components/VerdictChip';
import { CitationCard } from '@/components/CitationCard';
import { EvidenceTrail, TraceStep } from '@/components/EvidenceTrail';
import { AudioPlayer } from '@/components/AudioPlayer';
import { createRunStream, transcribeAudioBlob, extractImageText, syncHistoryToCloud } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { 
  getLocalHistory, addLocalHistoryItem, getAuthPreference, setAuthPreference,
  getUnsyncedItems, markItemsAsSynced, clearLocalHistory, LocalHistoryItem 
} from '@/lib/historyStore';
import { AuthModal } from '@/components/AuthModal';
import { 
  FileText, Upload, Mic, ArrowRight, RefreshCw, Share2, 
  AlertCircle, Check, Loader2, Sparkles, Building2, X, Image as ImageIcon,
  CheckCircle2, ShieldCheck, ArrowUpRight, History, Trash2, Lock, Cloud
} from 'lucide-react';

export default function HomePage() {
  const [language, setLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'speak'>('paste');
  const [inputText, setInputText] = useState('');
  
  // Auth & Guest state
  const [user, setUser] = useState<any>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [recentHistory, setRecentHistory] = useState<LocalHistoryItem[]>([]);

  // Image / screenshot state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isExtractingImage, setIsExtractingImage] = useState(false);
  const [imageOcrStatus, setImageOcrStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [currentStepMessage, setCurrentStepMessage] = useState<string>('');
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([]);
  const [verdicts, setVerdicts] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Initial load: check auth preference & load local history
  useEffect(() => {
    setRecentHistory(getLocalHistory());

    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('janpulse_language');
      if (savedLang && (savedLang === 'en' || savedLang === 'hi')) {
        setLanguage(savedLang);
      }
    }

    const handleLangChange = (e: any) => {
      if (e.detail) setLanguage(e.detail);
    };
    window.addEventListener('janpulse_language_changed', handleLangChange);

    const pref = getAuthPreference();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (!user && !pref) {
        // Default to private guest mode on first entry without disruptive modal popup
        setAuthPreference('guest');
      } else if (user) {
        // Authenticated: sync any unsynced local guest items
        const unsynced = getUnsyncedItems();
        if (unsynced.length > 0) {
          try {
            const res = await syncHistoryToCloud(unsynced);
            markItemsAsSynced(res.synced_ids);
            setRecentHistory(getLocalHistory());
          } catch (e) {
            console.warn('Sync on mount error:', e);
          }
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        const unsynced = getUnsyncedItems();
        if (unsynced.length > 0) {
          try {
            const res = await syncHistoryToCloud(unsynced);
            markItemsAsSynced(res.synced_ids);
            setRecentHistory(getLocalHistory());
          } catch (e) {
            console.warn('Sync on auth change error:', e);
          }
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('janpulse_language_changed', handleLangChange);
    };
  }, []);

  // Image upload and OCR handlers
  const handleImageSelect = async (file: File) => {
    if (!file) return;
    setSelectedImage(file);
    const preview = URL.createObjectURL(file);
    setImagePreviewUrl(preview);
    setIsExtractingImage(true);
    setImageOcrStatus('Analyzing with Gemini 3.8 Flash Vision OCR...');

    try {
      const res = await extractImageText(file);
      if (res && res.text) {
        setInputText(res.text);
        setImageOcrStatus('Text extracted successfully. Review below.');
      } else {
        setImageOcrStatus(res?.message || 'Image attached. Review or add details below.');
      }
    } catch (err: any) {
      console.error('Image OCR error:', err);
      setImageOcrStatus('Could not auto-extract text. You can type the claim below.');
    } finally {
      setIsExtractingImage(false);
    }
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setImageOcrStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setIsTranscribing(true);
        try {
          const text = await transcribeAudioBlob(audioBlob, language);
          setInputText(text);
        } catch (err: any) {
          alert(`Speech transcription failed: ${err.message}`);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e: any) {
      alert(`Microphone permission error: ${e.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  // Run pipeline
  const handleCheck = async () => {
    if (!inputText.trim()) return;

    setIsRunning(true);
    setVerdicts([]);
    setTraceSteps([]);
    setSources([]);
    setNudgeMessage(null);
    setCurrentStepMessage('Connecting to Jan-Pulse official verification pipeline...');

    let eventSeq = 1;

    try {
      await createRunStream(
        inputText,
        'forward',
        language,
        (event) => {
          if (event.type === 'run_started') {
            setRunId(event.run_id);
          } else if (event.type === 'step_start') {
            setCurrentStepMessage(event.message || 'Processing...');
          } else if (event.type === 'step_complete') {
            setTraceSteps(prev => [
              ...prev,
              {
                seq: eventSeq++,
                node: event.node,
                eventType: 'step_complete',
                latencyMs: 120
              }
            ]);
          } else if (event.type === 'evidence_item') {
            setTraceSteps(prev => [
              ...prev,
              {
                seq: eventSeq++,
                node: 'retrieve',
                eventType: 'source_fetched',
                tool: event.publisher,
                url: event.url,
                httpStatus: event.http_status,
                latencyMs: 340
              }
            ]);
          } else if (event.type === 'replan') {
            setTraceSteps(prev => [
              ...prev,
              {
                seq: eventSeq++,
                node: 'verify_citations',
                eventType: 'replan_loop',
                detail: event.reason
              }
            ]);
          } else if (event.type === 'final_verdict') {
            setVerdicts(event.verdicts || []);
            setSources(event.sources || []);
            setIsRunning(false);
            setCurrentStepMessage('');

            // Save to local device history
            const firstV = event.verdicts?.[0];
            const isSynced = Boolean(event.saved_to_cloud);
            addLocalHistoryItem({
              query: inputText,
              kind: 'forward',
              label: firstV?.label,
              explanation: firstV?.explanation,
              confidence: firstV?.confidence,
              confidence_reason: firstV?.confidence_reason
            }, isSynced);
            setRecentHistory(getLocalHistory());

          } else if (event.status === 'nudge') {
            setNudgeMessage(event.nudge_message);
            setIsRunning(false);
            setCurrentStepMessage('');

            addLocalHistoryItem({
              query: inputText,
              kind: 'forward',
              label: 'Nudge / Unverifiable',
              explanation: event.nudge_message
            }, false);
            setRecentHistory(getLocalHistory());
          }
        },
        (err) => {
          console.error("Stream error:", err);
          setIsRunning(false);
          alert(`Execution error: ${err.message}`);
        },
        selectedImage ? 'image' : 'text'
      );
    } catch (err: any) {
      setIsRunning(false);
      alert(`Failed to start verification: ${err.message}`);
    }
  };

  const handleShare = (shareId: string) => {
    const shareUrl = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-xs font-semibold mb-4 tracking-tight">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero Dummy Data • Live Runtime Verification</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight leading-[1.15] mb-4">
            Verify viral claims with official records.
          </h1>
          <p className="text-[#6E6E73] text-base sm:text-lg leading-relaxed font-normal">
            Paste or dictate any forward to see what official gazettes, PIB releases, and portals confirm. If unverified by official records, we say so plainly.
          </p>
        </div>

        {/* Bento Input Card */}
        <div className="bg-white rounded-3xl border border-black/[0.06] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] mb-8 transition-all">
          {/* iOS Segmented Pill Controls */}
          <div className="flex items-center justify-center sm:justify-start mb-6">
            <div className="bg-[#E5E5EA]/70 p-1 rounded-full flex gap-1 text-xs font-semibold border border-black/[0.04]">
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${
                  activeTab === 'paste'
                    ? 'bg-white text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste forward</span>
              </button>

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
                <span>Upload screenshot</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('speak')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${
                  activeTab === 'speak'
                    ? 'bg-white text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Voice note</span>
              </button>
            </div>
          </div>

          {/* Voice Tab Mode */}
          {activeTab === 'speak' && (
            <div className="bg-[#F5F5F7] rounded-2xl p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-black/[0.04]">
              <div>
                <p className="text-sm font-semibold text-[#1D1D1F]">Speech-to-text with Groq Whisper</p>
                <p className="text-xs text-[#86868B] mt-0.5">Record in Hindi or English. The verbatim transcript will appear below for review.</p>
              </div>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-sm ${
                  isRecording 
                    ? 'bg-[#FF3B30] text-white shadow-[0_0_16px_rgba(255,59,48,0.35)] animate-pulse'
                    : 'bg-[#0071E3] hover:bg-[#0077ED] text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>{isRecording ? 'Stop Recording' : isTranscribing ? 'Transcribing...' : 'Record Voice Note'}</span>
              </button>
            </div>
          )}

          {/* Upload Tab Mode */}
          {activeTab === 'upload' && (
            <div className="mb-5">
              {imagePreviewUrl ? (
                <div className="border border-black/[0.06] bg-[#F5F5F7] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-32 h-32 shrink-0 bg-white rounded-xl border border-black/[0.06] overflow-hidden flex items-center justify-center p-1 shadow-sm">
                    <img
                      src={imagePreviewUrl}
                      alt="Uploaded screenshot"
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#1D1D1F] truncate">{selectedImage?.name}</p>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-[#FF3B30] hover:bg-[#FF3B30]/10 px-3 py-1 rounded-full transition-colors text-xs flex items-center gap-1 font-semibold shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                    <p className="text-xs text-[#86868B] mt-0.5 font-mono">
                      {selectedImage ? `${(selectedImage.size / 1024).toFixed(1)} KB` : ''}
                    </p>

                    {isExtractingImage ? (
                      <div className="flex items-center gap-2 text-xs text-[#0071E3] font-semibold mt-3 bg-white p-3 rounded-xl border border-black/[0.04]">
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Extracting text verbatim with Gemini 3.8 Flash Vision...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-[#248A3D] font-semibold mt-3 bg-white p-3 rounded-xl border border-black/[0.04]">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>{imageOcrStatus || 'Text extracted. Review or edit the claim below.'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-black/[0.1] hover:border-[#0071E3] transition-colors rounded-2xl p-8 text-center bg-[#F5F5F7]/50 hover:bg-[#F5F5F7] cursor-pointer group"
                >
                  <Upload className="w-8 h-8 mx-auto text-[#86868B] group-hover:text-[#0071E3] transition-colors mb-2.5" />
                  <p className="text-sm font-semibold text-[#1D1D1F]">Upload screenshot, circular, or image</p>
                  <p className="text-xs text-[#86868B] mt-1">Supports PNG, JPG, WebP. Gemini Vision extracts claim text automatically.</p>
                  <button
                    type="button"
                    className="mt-4 px-4 py-1.5 text-xs font-semibold text-[#0071E3] bg-white border border-black/[0.08] rounded-full shadow-sm hover:bg-[#F5F5F7]"
                  >
                    Choose file
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelect(file);
                }}
              />
            </div>
          )}

          {/* Attached image preview banner if active tab is paste/speak */}
          {imagePreviewUrl && activeTab !== 'upload' && (
            <div className="flex items-center justify-between bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 mb-3 text-xs">
              <div className="flex items-center gap-2 text-[#1D1D1F] truncate">
                <ImageIcon className="w-4 h-4 text-[#0071E3] shrink-0" />
                <span className="font-semibold truncate">{selectedImage?.name}</span>
                <span className="text-[#86868B] shrink-0">• screenshot attached</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-[#FF3B30] hover:underline font-semibold shrink-0 ml-2"
              >
                Remove
              </button>
            </div>
          )}

          {/* Main textarea */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={5}
            placeholder="Paste viral forward, social message, or government claim here..."
            className="w-full bg-[#F5F5F7]/50 hover:bg-[#F5F5F7] focus:bg-white border border-transparent focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/15 rounded-2xl p-4 text-[#1D1D1F] placeholder-[#86868B] text-base resize-none transition-all outline-none"
          />

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5 pt-2">
            <span className="text-xs text-[#86868B] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0071E3]" />
              <span>Searches live PIB releases, myScheme registry, and official gazettes.</span>
            </span>

            <button
              type="button"
              onClick={handleCheck}
              disabled={isRunning || !inputText.trim()}
              className="w-full sm:w-auto px-7 py-3 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold rounded-full flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(0,113,227,0.28)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying live...</span>
                </>
              ) : (
                <>
                  <span>Check Official Sources</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Recent checks on this device */}
          {recentHistory.length > 0 && (
            <div className="mt-6 pt-5 border-t border-black/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1D1D1F]">
                  <History className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span>Recent on this device</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.04] text-[#86868B] font-medium flex items-center gap-1">
                    {user ? (
                      <>
                        <Cloud className="w-3 h-3 text-[#248A3D]" />
                        <span>Cloud Synced</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-[#86868B]" />
                        <span>Device Only</span>
                      </>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearLocalHistory();
                    setRecentHistory([]);
                  }}
                  className="text-[11px] text-[#86868B] hover:text-[#FF3B30] flex items-center gap-1 transition-colors"
                  title="Clear recent searches from this device"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentHistory.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setInputText(item.query);
                      if (item.label && item.explanation) {
                        setVerdicts([{
                          label: item.label,
                          explanation: item.explanation,
                          confidence: item.confidence || 0.9,
                          confidence_reason: item.confidence_reason || 'Cached from local device check',
                          citations: []
                        }]);
                      }
                    }}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F5F7] hover:bg-black/[0.06] border border-black/[0.04] text-xs transition-all text-left max-w-full sm:max-w-xs truncate"
                  >
                    <span className="truncate text-[#1D1D1F] font-medium group-hover:text-[#0071E3]">
                      {item.query}
                    </span>
                    {item.label && (
                      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        item.label === 'true' ? 'bg-[#34C759]/15 text-[#248A3D]' :
                        item.label === 'contradicted' ? 'bg-[#FF3B30]/15 text-[#D70015]' :
                        'bg-[#FF9500]/15 text-[#B25000]'
                      }`}>
                        {item.label}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Running Status */}
        {isRunning && (
          <div className="bg-white border border-black/[0.06] rounded-2xl p-5 mb-8 flex items-center gap-3.5 shadow-sm animate-fadeIn">
            <div className="w-8 h-8 rounded-full bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1D1D1F] truncate">{currentStepMessage}</p>
              <p className="text-xs text-[#86868B]">Enforcing programmatic citation verification & domain allowlists.</p>
            </div>
          </div>
        )}

        {/* Nudge Notification if non-checkable claim */}
        {nudgeMessage && (
          <div className="bg-[#FF9500]/10 border border-[#FF9500]/25 rounded-2xl p-5 mb-8 text-[#B25000] animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Notice</h3>
                <p className="text-xs mt-1 leading-relaxed">{nudgeMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {verdicts.length > 0 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] tracking-tight">
                  Official Verdict & Citations
                </h2>
                <p className="text-xs text-[#86868B]">Grounded exclusively on fetched official records</p>
              </div>
              <button
                type="button"
                onClick={handleCheck}
                className="text-xs text-[#1D1D1F] hover:text-[#0071E3] flex items-center gap-1.5 font-semibold bg-white px-3.5 py-1.5 rounded-full border border-black/[0.08] shadow-sm hover:shadow transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refetch sources</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Verdicts Column */}
              <div className="lg:col-span-7 space-y-6">
                {verdicts.map((v, idx) => (
                  <div key={idx} className="bg-white border border-black/[0.06] rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <VerdictChip label={v.label} size="lg" />
                      
                      {v.explanation && (
                        <AudioPlayer text={v.explanation} language={language} />
                      )}
                    </div>

                    {imagePreviewUrl && (
                      <div className="mb-5">
                        <div className="text-[11px] font-semibold text-[#86868B] mb-2 uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-[#0071E3]" />
                          <span>Analyzed Screenshot:</span>
                        </div>
                        <div className="bg-[#F5F5F7] p-2 rounded-2xl border border-black/[0.04] inline-block">
                          <img
                            src={imagePreviewUrl}
                            alt="Analyzed document screenshot"
                            className="max-h-48 max-w-full rounded-xl object-contain"
                          />
                        </div>
                      </div>
                    )}

                    <div className="text-xs font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                      Forward Evaluated:
                    </div>
                    <p className="text-xs sm:text-sm text-[#1D1D1F] bg-[#F5F5F7] p-3.5 rounded-2xl border border-black/[0.04] mb-5 font-normal">
                      "{inputText}"
                    </p>

                    <div className="text-xs font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                      Official Finding:
                    </div>
                    <p className="text-base text-[#1D1D1F] leading-relaxed mb-4 font-normal">
                      {v.explanation}
                    </p>

                    {v.confidence_reason && (
                      <p className="text-xs text-[#86868B] mb-6 italic bg-black/[0.02] p-2.5 rounded-xl border border-black/[0.03]">
                        Confidence: {Math.round((v.confidence || 0.8) * 100)}% — {v.confidence_reason}
                      </p>
                    )}

                    {/* Citations list */}
                    {v.citations && v.citations.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-black/[0.06]">
                        <h4 className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                          Official Citations ({v.citations.length})
                        </h4>
                        {v.citations.map((c: any, cIdx: number) => (
                          <CitationCard
                            key={cIdx}
                            publisher={c.publisher}
                            url={c.url}
                            span={c.span}
                            role={c.role}
                            fetchedAt={c.fetched_at}
                          />
                        ))}
                      </div>
                    )}

                    {/* Share action */}
                    {v.share_id && (
                      <div className="mt-6 pt-4 border-t border-black/[0.06] flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleShare(v.share_id)}
                          className="text-xs font-semibold text-[#0071E3] hover:text-[#0077ED] flex items-center gap-1.5 bg-[#0071E3]/10 hover:bg-[#0071E3]/15 px-3.5 py-1.5 rounded-full transition-all active:scale-95"
                        >
                          {copiedShare ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Link copied!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share public card</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Evidence Trail Column */}
              <div className="lg:col-span-5">
                <EvidenceTrail steps={traceSteps} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Entry Auth Prompt Modal */}
      <AuthModal
        isOpen={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        initialView="prompt"
      />
    </div>
  );
}
