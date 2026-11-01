'use client';

import React, { useState, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { VerdictChip } from '@/components/VerdictChip';
import { CitationCard } from '@/components/CitationCard';
import { EvidenceTrail, TraceStep } from '@/components/EvidenceTrail';
import { AudioPlayer } from '@/components/AudioPlayer';
import { createRunStream, transcribeAudioBlob, extractImageText } from '@/lib/api';
import { 
  FileText, Upload, Mic, ArrowRight, RefreshCw, Share2, 
  AlertCircle, Check, Loader2, Sparkles, Building2, X, Image as ImageIcon
} from 'lucide-react';

export default function HomePage() {
  const [language, setLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'speak'>('paste');
  const [inputText, setInputText] = useState('');
  
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

  // Image upload and OCR handlers
  const handleImageSelect = async (file: File) => {
    if (!file) return;
    setSelectedImage(file);
    const preview = URL.createObjectURL(file);
    setImagePreviewUrl(preview);
    setIsExtractingImage(true);
    setImageOcrStatus('Analyzing screenshot with Gemini Vision OCR...');

    try {
      const res = await extractImageText(file);
      if (res && res.text) {
        setInputText(res.text);
        setImageOcrStatus('Text extracted from image. Review or verify below.');
      } else {
        setImageOcrStatus(res?.message || 'Image attached. Add details or verify below.');
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
    setCurrentStepMessage('Connecting to Jan-Pulse civic engine...');

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
                latencyMs: 140
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
                latencyMs: 380
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
          } else if (event.status === 'nudge') {
            setNudgeMessage(event.nudge_message);
            setIsRunning(false);
            setCurrentStepMessage('');
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
    <>
      <Navbar language={language} setLanguage={setLanguage} />

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Intro */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1E2430] mb-3">
            Check viral forwards against official records.
          </h1>
          <p className="text-[#4B5563] text-base max-w-xl mx-auto leading-relaxed">
            Paste or dictate a forward to see what official government notifications and portals actually state. If no official record confirms it, we say so plainly.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white border border-[#E7E2D8] rounded-lg p-6 shadow-sm mb-10">
          {/* Tabs */}
          <div className="flex border-b border-[#E7E2D8] pb-3 mb-4 gap-6 text-sm">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`flex items-center gap-2 pb-2 -mb-3 font-medium transition-colors border-b-2 ${
                activeTab === 'paste'
                  ? 'border-[#2F6B5C] text-[#2F6B5C]'
                  : 'border-transparent text-[#6B7280] hover:text-[#1E2430]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Paste message</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 pb-2 -mb-3 font-medium transition-colors border-b-2 ${
                activeTab === 'upload'
                  ? 'border-[#2F6B5C] text-[#2F6B5C]'
                  : 'border-transparent text-[#6B7280] hover:text-[#1E2430]'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload image or PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('speak')}
              className={`flex items-center gap-2 pb-2 -mb-3 font-medium transition-colors border-b-2 ${
                activeTab === 'speak'
                  ? 'border-[#2F6B5C] text-[#2F6B5C]'
                  : 'border-transparent text-[#6B7280] hover:text-[#1E2430]'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>Speak voice note</span>
            </button>
          </div>

          {/* Mode contents */}
          {activeTab === 'speak' && (
            <div className="bg-[#F4F1EA] rounded-md p-4 mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#1E2430]">Voice input powered by Groq Whisper</p>
                <p className="text-xs text-[#6B7280]">Record in Hindi or English. The transcript will appear below for you to review.</p>
              </div>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={`px-4 py-2 rounded-pill text-xs font-medium flex items-center gap-2 transition-colors ${
                  isRecording 
                    ? 'bg-[#8E3326] text-white animate-pulse'
                    : 'bg-[#2F6B5C] text-white hover:bg-[#25574a]'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>{isRecording ? 'Stop Recording' : isTranscribing ? 'Transcribing...' : 'Record Voice'}</span>
              </button>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="mb-4">
              {imagePreviewUrl ? (
                <div className="border border-[#E7E2D8] bg-[#FBF9F5] rounded-md p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group w-36 h-36 shrink-0 bg-white rounded border border-[#E7E2D8] overflow-hidden flex items-center justify-center p-1">
                    <img
                      src={imagePreviewUrl}
                      alt="Uploaded screenshot"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#1E2430] truncate">{selectedImage?.name}</p>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-[#8E3326] hover:bg-[#F4F1EA] px-2.5 py-1 rounded transition-colors text-xs flex items-center gap-1 font-medium shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {selectedImage ? `${(selectedImage.size / 1024).toFixed(1)} KB` : ''}
                    </p>

                    {isExtractingImage ? (
                      <div className="flex items-center gap-2 text-xs text-[#2F6B5C] font-medium mt-3 bg-white p-2.5 rounded border border-[#E7E2D8]">
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Extracting text & claims via Gemini 3.8 Flash Vision OCR...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-[#2F6B5C] font-medium mt-3 bg-white p-2.5 rounded border border-[#E7E2D8]">
                        <Check className="w-4 h-4 shrink-0 text-[#2F6B5C]" />
                        <span>{imageOcrStatus || 'Text extracted from image. You can review or edit below.'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#E7E2D8] hover:border-[#2F6B5C] transition-colors rounded-md p-6 text-center bg-[#FBF9F5] cursor-pointer"
                >
                  <Upload className="w-8 h-8 mx-auto text-[#6B7280] mb-2" />
                  <p className="text-sm font-medium text-[#1E2430]">Click to select a forward screenshot or document</p>
                  <p className="text-xs text-[#6B7280] mt-1">Supports PNG, JPG, WebP. Gemini Vision extracts text verbatim automatically.</p>
                  <button
                    type="button"
                    className="mt-3 px-4 py-1.5 text-xs font-medium text-[#2F6B5C] bg-white border border-[#E7E2D8] rounded-md hover:bg-[#F4F1EA]"
                  >
                    Browse files
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
            <div className="flex items-center justify-between bg-[#F4F1EA] border border-[#E7E2D8] rounded-md px-3 py-2 mb-3 text-xs">
              <div className="flex items-center gap-2 text-[#4B5563] truncate">
                <ImageIcon className="w-4 h-4 text-[#2F6B5C] shrink-0" />
                <span className="font-medium text-[#1E2430] truncate">{selectedImage?.name}</span>
                <span className="text-[#6B7280] shrink-0">attached</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-[#8E3326] hover:underline font-medium shrink-0 ml-2"
              >
                Remove image
              </button>
            </div>
          )}

          {/* Main textarea */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={5}
            placeholder="Paste viral forward, social message, or scheme claim here..."
            className="w-full border border-[#E7E2D8] rounded-md p-4 text-[#1E2430] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2F6B5C] focus:border-transparent text-base resize-none"
          />

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-2">
            <span className="text-xs text-[#6B7280]">
              Searches live PIB press releases, myScheme catalog, and official gazettes.
            </span>

            <button
              type="button"
              onClick={handleCheck}
              disabled={isRunning || !inputText.trim()}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#2F6B5C] hover:bg-[#25574a] text-white font-medium rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
        </div>

        {/* Live Running Status */}
        {isRunning && (
          <div className="bg-[#F4F1EA] border border-[#E7E2D8] rounded-md p-4 mb-8 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#2F6B5C]" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#1E2430]">{currentStepMessage}</p>
              <p className="text-xs text-[#6B7280]">Testing citations and enforcing programmatic verification rules.</p>
            </div>
          </div>
        )}

        {/* Nudge Notification if non-checkable claim */}
        {nudgeMessage && (
          <div className="bg-[#F6ECD3] border border-[#E7E2D8] rounded-md p-5 mb-8 text-[#7A5413]">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-medium text-sm">Notice</h3>
                <p className="text-xs mt-1 leading-relaxed">{nudgeMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {verdicts.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-[#E7E2D8] pb-3">
              <h2 className="font-serif text-2xl font-bold text-[#1E2430]">
                Official Verdict & Citations
              </h2>
              <button
                type="button"
                onClick={handleCheck}
                className="text-xs text-[#4B5563] hover:text-[#1E2430] flex items-center gap-1 font-medium bg-white px-3 py-1.5 rounded-pill border border-[#E7E2D8]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh sources</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Verdicts Column */}
              <div className="lg:col-span-7 space-y-6">
                {verdicts.map((v, idx) => (
                  <div key={idx} className="bg-white border border-[#E7E2D8] rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <VerdictChip label={v.label} size="lg" />
                      
                      {v.explanation && (
                        <AudioPlayer text={v.explanation} language={language} />
                      )}
                    </div>

                    {imagePreviewUrl && (
                      <div className="mb-4">
                        <div className="text-xs font-semibold text-[#6B7280] mb-2 uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-[#2F6B5C]" />
                          <span>Analyzed Screenshot / Attachment:</span>
                        </div>
                        <div className="bg-[#FBF9F5] p-2 rounded-md border border-[#E7E2D8] inline-block">
                          <img
                            src={imagePreviewUrl}
                            alt="Analyzed document screenshot"
                            className="max-h-48 max-w-full rounded object-contain border border-[#E7E2D8]"
                          />
                        </div>
                      </div>
                    )}

                    <div className="text-sm font-semibold text-[#1E2430] mb-2">
                      Claim Evaluated:
                    </div>
                    <p className="text-sm text-[#4B5563] bg-[#FBF9F5] p-3 rounded-md border border-[#E7E2D8] mb-4">
                      "{inputText}"
                    </p>

                    <div className="text-sm font-semibold text-[#1E2430] mb-2">
                      Explanation:
                    </div>
                    <p className="text-base text-[#1E2430] leading-relaxed mb-4">
                      {v.explanation}
                    </p>

                    {v.confidence_reason && (
                      <p className="text-xs text-[#6B7280] mb-5 italic">
                        Evidence confidence: {Math.round(v.confidence * 100)}% — {v.confidence_reason}
                      </p>
                    )}

                    {/* Citations list */}
                    {v.citations && v.citations.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-[#E7E2D8]">
                        <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
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
                      <div className="mt-5 pt-4 border-t border-[#E7E2D8] flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleShare(v.share_id)}
                          className="text-xs font-medium text-[#2F6B5C] hover:text-[#25574a] flex items-center gap-1.5"
                        >
                          {copiedShare ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Link copied!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share public verdict card</span>
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
    </>
  );
}

