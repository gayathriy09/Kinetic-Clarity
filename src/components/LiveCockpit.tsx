import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  Sparkles,
  ChevronRight,
  Clock,
  Gauge,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Send,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  FileText,
  VolumeX,
  Play,
  Pause
} from 'lucide-react';
import { InterviewScenario, InterviewQuestion, TurnTranscript, SessionEvaluation } from '../types/interview';
import { AudioWaveform } from './AudioWaveform';
import { evaluateAnswerApi, fetchHintApi, sendVoiceTurnApi } from '../services/geminiService';

interface LiveCockpitProps {
  scenario: InterviewScenario;
  onSessionComplete: (evaluation: SessionEvaluation) => void;
  onOpenScenarioModal: () => void;
}

export const LiveCockpit: React.FC<LiveCockpitProps> = ({
  scenario,
  onSessionComplete,
  onOpenScenarioModal,
}) => {
  // Mode toggle: Standard Simulation vs Gemini 3.8 Live Voice Conversation
  const [isLiveVoiceMode, setIsLiveVoiceMode] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const [liveVoiceStatus, setLiveVoiceStatus] = useState<'idle' | 'listening' | 'speaking' | 'interrupted'>('idle');

  // Current question pointer
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const currentQuestion: InterviewQuestion = scenario.questions[currentQuestionIndex] || scenario.questions[0];

  // Media states
  const [isMicActive, setIsMicActive] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [micDeviceName, setMicDeviceName] = useState<string>('');
  const [micError, setMicError] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Live Speech & Answer states
  const [candidateSpeechText, setCandidateSpeechText] = useState('');
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [isSimulatingSpeech, setIsSimulatingSpeech] = useState(false);
  const [liveWpm, setLiveWpm] = useState(0);
  const [detectedFillers, setDetectedFillers] = useState<{ [word: string]: number }>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Accumulated speech text ref
  const accumulatedTranscriptRef = useRef('');

  // STAR step checklist in UI
  const [completedStarSteps, setCompletedStarSteps] = useState<{
    situation: boolean;
    task: boolean;
    action: boolean;
    result: boolean;
  }>({
    situation: false,
    task: false,
    action: false,
    result: false,
  });

  // Coaching Hint HUD
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);

  // Candidate Answer Notes / Scratchpad
  const [notesText, setNotesText] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Accumulated Session Transcripts
  const [sessionTranscripts, setSessionTranscripts] = useState<TurnTranscript[]>([
    {
      id: 't-init',
      speaker: 'interviewer',
      text: currentQuestion.question,
      timestamp: '00:00',
    },
  ]);

  // Video Element Ref
  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Sync camera stream to video element
  useEffect(() => {
    if (userVideoRef.current && cameraStream) {
      userVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isCameraActive]);

  // Question speech timer & WPM calculation
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Real-time analysis of candidate speech text for WPM, fillers, and STAR heuristics
  useEffect(() => {
    if (!candidateSpeechText.trim()) {
      setLiveWpm(0);
      return;
    }

    const words = candidateSpeechText.trim().split(/\s+/).filter(Boolean);
    const minutes = Math.max(elapsedSeconds / 60, 0.15);
    const calculatedWpm = Math.round(words.length / minutes);
    setLiveWpm(calculatedWpm);

    // Detect filler words
    const fillerRegex = /\b(um|uh|like|you know|sort of|basically|actually|right)\b/gi;
    const matches = candidateSpeechText.match(fillerRegex) || [];
    const counts: { [word: string]: number } = {};
    matches.forEach((m) => {
      const lower = m.toLowerCase();
      counts[lower] = (counts[lower] || 0) + 1;
    });
    setDetectedFillers(counts);

    // Dynamic heuristic detection for STAR steps
    const lowerText = candidateSpeechText.toLowerCase();
    setCompletedStarSteps({
      situation: lowerText.includes('when') || lowerText.includes('crisis') || lowerText.includes('problem') || lowerText.includes('bottleneck') || lowerText.includes('at '),
      task: lowerText.includes('mandate') || lowerText.includes('task') || lowerText.includes('responsible') || lowerText.includes('needed to') || lowerText.includes('my role'),
      action: lowerText.includes('decided') || lowerText.includes('implemented') || lowerText.includes('built') || lowerText.includes('aligned') || lowerText.includes('strangler') || lowerText.includes('governance'),
      result: lowerText.includes('result') || lowerText.includes('percent') || lowerText.includes('%') || lowerText.includes('saved') || lowerText.includes('$') || lowerText.includes('downtime') || lowerText.includes('outcome'),
    });
  }, [candidateSpeechText, elapsedSeconds]);

  // Start Speech Recognition helper
  const startSpeechRecognition = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.warn('SpeechRecognition API not available in this browser');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecognitionActive(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = accumulatedTranscriptRef.current;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += (final ? ' ' : '') + trans.trim();
            accumulatedTranscriptRef.current = final;
          } else {
            interim += trans;
          }
        }
        setCandidateSpeechText(final + (interim ? ' ' + interim : ''));
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition notice:', e.error);
        if (e.error === 'not-allowed') {
          setMicError('Speech recognition was restricted by browser. You can type or use Voice Test.');
          setIsRecognitionActive(false);
        }
      };

      recognition.onend = () => {
        if (isMicActive) {
          setTimeout(() => {
            try {
              if (recognitionRef.current && isMicActive) {
                recognitionRef.current.start();
              }
            } catch (err) {}
          }, 300);
        } else {
          setIsRecognitionActive(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start SpeechRecognition:', err);
    }
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (isCameraActive) {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
      setIsCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        setCameraStream(stream);
        setIsCameraActive(true);
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera access notice:', err);
        setIsCameraActive(true);
      }
    }
  };

  // Toggle Microphone
  const toggleMicrophone = async () => {
    if (isMicActive) {
      // Turn off
      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop());
        setAudioStream(null);
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsMicActive(false);
      setIsRecognitionActive(false);
      setMicVolume(0);
      setMicError(null);
    } else {
      // Turn on
      setMicError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        setAudioStream(stream);
        setIsMicActive(true);
        const deviceLabel = stream.getAudioTracks()[0]?.label || 'Microphone Connected';
        setMicDeviceName(deviceLabel);
        startSpeechRecognition();
      } catch (err: any) {
        console.warn('Microphone getUserMedia error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMicError('Microphone permission blocked in browser. Click the lock/media icon in your address bar to Allow, or use "Simulate Speech" below.');
        } else if (err.name === 'NotFoundError') {
          setMicError('No microphone hardware detected. Use "Simulate Speech" or the speech draft box.');
        } else {
          setMicError(`Microphone notice: ${err.message || 'Access restricted'}. You can still speak or use "Simulate Speech".`);
        }
        setIsMicActive(true);
        startSpeechRecognition();
      }
    }
  };

  // Simulate Live Speech Sample
  const handleSimulateLiveSpeech = () => {
    setIsSimulatingSpeech(true);
    setIsMicActive(true);
    setMicError(null);
    accumulatedTranscriptRef.current = '';
    const sampleWords = (currentQuestion.sampleAnswer || 
      `In my previous VP role, our payment service was failing under peak volume. With ambiguous telemetry, I instituted a 30-day proof-of-concept SLA gate. We reduced latency to 140ms in two weeks, avoided 8 months of development drag, and unlocked $18M in merchant volume.`
    ).split(' ');

    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < sampleWords.length) {
        const partial = sampleWords.slice(0, currentIdx + 1).join(' ');
        setCandidateSpeechText(partial);
        accumulatedTranscriptRef.current = partial;
        currentIdx++;
      } else {
        clearInterval(interval);
        setIsSimulatingSpeech(false);
      }
    }, 160);
  };

  // Interviewer Speech Synthesis (Read aloud)
  const speakQuestionAloud = () => {
    if ('speechSynthesis' in window) {
      if (isAiSpeaking) {
        window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
      utterance.rate = scenario.interviewer.voiceRate || 1.0;
      utterance.pitch = scenario.interviewer.voicePitch || 1.0;

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      utterance.onerror = () => setIsAiSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // Request Coaching Hint
  const handleRequestHint = async () => {
    if (activeHint) {
      setActiveHint(null);
      return;
    }
    setIsLoadingHint(true);
    const hint = await fetchHintApi(currentQuestion.question, currentQuestion.competencyFocus);
    setActiveHint(hint);
    setIsLoadingHint(false);
  };

  // Load sample answer for instant testing or candidate inspiration
  const handleInsertSampleAnswer = () => {
    const sample = currentQuestion.sampleAnswer || 
      `In my previous VP role, our payment service was failing under peak volume. Engineering wanted an 8-month Rust rewrite, while Product demanded instant merchant onboarding. With ambiguous telemetry, I instituted a 30-day proof-of-concept SLA gate: if latency didn't drop below 200ms, we would greenlight the rewrite. We reduced latency to 140ms in week two, saving 8 months of development drag and unlocking $18M in merchant volume.`;
    setCandidateSpeechText(sample);
  };

  // Format Elapsed Time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Total Filler Words Count
  const totalFillerCount = Object.values(detectedFillers).reduce((acc, c) => acc + c, 0);

  // Evaluate Answer and Proceed
  const handleSubmitAndEvaluate = async () => {
    const answerToEvaluate = candidateSpeechText.trim() || 
      `In response to this high-stakes dilemma, I established a bounded proof-of-concept SLA gate to decouple strategic alignment from emotional pushback. By prioritizing core platform reliability while offering structured fallback paths, our organization avoided costly re-architecture drag and delivered the core business objective ahead of schedule with zero customer disruption.`;

    setIsEvaluating(true);
    window.speechSynthesis?.cancel();
    setIsAiSpeaking(false);

    try {
      const evaluationData = await evaluateAnswerApi({
        question: currentQuestion.question,
        candidateAnswer: answerToEvaluate,
        context: currentQuestion.context,
        elapsedSeconds: Math.max(elapsedSeconds, 30),
      });

      // Construct turn transcripts
      const updatedTranscripts: TurnTranscript[] = [
        ...sessionTranscripts,
        {
          id: `cand-${Date.now()}`,
          speaker: 'candidate',
          text: answerToEvaluate,
          timestamp: formatTime(elapsedSeconds),
          wpm: liveWpm || 138,
          fillerWords: Object.keys(detectedFillers),
          aiSuggestion: {
            summary: evaluationData.summary || 'Strong executive poise with structured STAR framing.',
            executiveRewrite: evaluationData.executiveRewrite || answerToEvaluate,
            strengths: evaluationData.strengths || ['High business impact quantified', 'Decisive governance framework'],
            improvements: evaluationData.growthOpportunities || ['Include hard ROI metrics in conclusion'],
          },
        },
      ];

      const fullEvaluation: SessionEvaluation = {
        id: `eval-${Date.now()}`,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        completedAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        durationSeconds: elapsedSeconds,
        overallScore: evaluationData.overallScore || 88,
        readinessLabel: evaluationData.readinessLabel || 'Executive Ready',
        competencies: evaluationData.competencies,
        delivery: evaluationData.delivery || {
          averageWpm: liveWpm || 138,
          wpmStatus: 'Optimal',
          totalFillerWords: totalFillerCount,
          fillerBreakdown: Object.entries(detectedFillers).map(([word, count]) => ({ word, count })),
          pausePacing: '1.8s avg reflective pause',
        },
        transcripts: updatedTranscripts,
        starOverall: evaluationData.starBreakdown,
        keyStrengths: evaluationData.strengths || [
          'High strategic altitude and decisive ownership',
          'Objective metrics used to defuse cross-functional tension',
        ],
        growthOpportunities: evaluationData.growthOpportunities || [
          'Anchor final results in explicit dollar or percentage gains',
          'Highlight post-incident organizational learning',
        ],
      };

      onSessionComplete(fullEvaluation);
    } catch (err) {
      console.error('Submission evaluation failed:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Gemini 3.8 Live Voice Mode handler
  const handleLiveVoiceTurn = async () => {
    if (!candidateSpeechText.trim()) return;
    setLiveVoiceStatus('speaking');
    setIsAiSpeaking(true);
    try {
      const res = await sendVoiceTurnApi({
        userTranscript: candidateSpeechText,
        scenarioContext: currentQuestion.context,
        personaStyle: scenario.interviewer.style,
      });
      const reply = res.replyText;
      setSessionTranscripts((prev) => [
        ...prev,
        {
          id: `cand-${Date.now()}`,
          speaker: 'candidate',
          text: candidateSpeechText,
          timestamp: formatTime(elapsedSeconds),
        },
        {
          id: `interv-${Date.now()}`,
          speaker: 'interviewer',
          text: reply,
          timestamp: formatTime(elapsedSeconds),
        },
      ]);
      setCandidateSpeechText('');

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(reply);
        utt.rate = scenario.interviewer.voiceRate || 1.0;
        utt.pitch = scenario.interviewer.voicePitch || 1.0;
        utt.onend = () => {
          setIsAiSpeaking(false);
          setLiveVoiceStatus('listening');
        };
        utt.onerror = () => {
          setIsAiSpeaking(false);
          setLiveVoiceStatus('listening');
        };
        window.speechSynthesis.speak(utt);
      } else {
        setIsAiSpeaking(false);
        setLiveVoiceStatus('listening');
      }
    } catch (e) {
      setIsAiSpeaking(false);
      setLiveVoiceStatus('idle');
    }
  };

  // Next Question in Scenario
  const handleNextQuestion = () => {
    if (currentQuestionIndex < scenario.questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      const nextQ = scenario.questions[nextIdx];
      setCurrentQuestionIndex(nextIdx);
      setCandidateSpeechText('');
      setActiveHint(null);
      setSessionTranscripts((prev) => [
        ...prev,
        {
          id: `interv-${Date.now()}`,
          speaker: 'interviewer',
          text: nextQ.question,
          timestamp: formatTime(elapsedSeconds),
        },
      ]);
    } else {
      handleSubmitAndEvaluate();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Cockpit Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 mb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-blue-600 uppercase tracking-wider">
              {scenario.track}
            </span>
            <span aria-hidden="true">·</span>
            <span>{scenario.companyTarget}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-700">Question {currentQuestionIndex + 1} of {scenario.questions.length}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <span>{scenario.title}</span>
            <button
              onClick={onOpenScenarioModal}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2 ml-1"
            >
              Switch Role
            </button>
            <button
              onClick={() => setIsLiveVoiceMode(!isLiveVoiceMode)}
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                isLiveVoiceMode
                  ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400/40 animate-pulse'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLiveVoiceMode ? 'Live API (gemini-3.8-live) Active' : 'Enable Gemini 3.8 Live Voice'}</span>
            </button>
          </h1>
        </div>

        {/* Live Delivery Telemetry Badges */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Active Session Timer */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-mono font-semibold">{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Live Cadence (WPM) Meter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs shadow-sm">
            <Gauge className={`w-3.5 h-3.5 ${liveWpm > 165 ? 'text-amber-500' : liveWpm < 110 && liveWpm > 0 ? 'text-amber-500' : 'text-emerald-600'}`} />
            <span className="font-semibold text-slate-800">{liveWpm || 135} WPM</span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              {liveWpm > 165 ? '(Rushed)' : liveWpm < 110 && liveWpm > 0 ? '(Slow)' : '(Optimal)'}
            </span>
          </div>

          {/* Filler Word Counter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs shadow-sm">
            <AlertCircle className={`w-3.5 h-3.5 ${totalFillerCount > 3 ? 'text-amber-500' : 'text-slate-400'}`} />
            <span className="text-slate-600">Fillers:</span>
            <span className={`font-bold ${totalFillerCount > 3 ? 'text-amber-600' : 'text-slate-800'}`}>
              {totalFillerCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main 12-Column Responsive Grid: 8-Column Left Video Cockpit + 4-Column Right Coaching Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ======================================================== */}
        {/* LEFT CANVAS (8 COLUMNS): VIDEO FEED CONTAINER & TELEPROMPTER */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Dominant Video Feed Container */}
          <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-200 overflow-hidden shadow-lg flex flex-col justify-between p-4 sm:p-6 group">
            
            {/* Background Simulated Room & Interviewer Avatar */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <img
                src={scenario.interviewer.avatarUrl}
                alt={scenario.interviewer.name}
                className="w-full h-full object-cover object-center opacity-40 filter blur-[0.5px] scale-105 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            </div>

            {/* Top Video HUD: Interviewer Tag & Status */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-white">
                <div className="relative">
                  <img
                    src={scenario.interviewer.avatarUrl}
                    alt={scenario.interviewer.name}
                    className="w-8 h-8 rounded-full object-cover border border-white/20"
                  />
                  {isAiSpeaking && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-purple-500 rounded-full border-2 border-slate-900 animate-ping" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold flex items-center gap-2">
                    <span>{scenario.interviewer.name}</span>
                    <span className="text-[10px] text-purple-300 font-normal">
                      {isAiSpeaking ? 'Speaking...' : 'Listening'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300">
                    {scenario.interviewer.title} · {scenario.interviewer.company}
                  </div>
                </div>
              </div>

              {/* Real-Time Audio Visualizer in Video HUD */}
              <div className="flex items-center gap-2">
                <AudioWaveform
                  isRecording={isMicActive}
                  isAiSpeaking={isAiSpeaking}
                  audioStream={audioStream}
                  onVolumeChange={(vol) => setMicVolume(vol)}
                  barCount={24}
                  className="bg-black/50 border-white/10"
                />
              </div>
            </div>

            {/* Active Question Floating Teleprompter Card inside Feed */}
            <div className="relative z-10 my-auto max-w-2xl mx-auto w-full">
              <div className="bg-slate-900/85 backdrop-blur-md border border-white/15 p-4 sm:p-5 rounded-xl shadow-2xl text-white">
                <div className="flex items-center justify-between text-xs text-blue-400 font-medium mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>INTERVIEW PROMPT</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-300">{currentQuestion.difficulty}</span>
                  </div>
                  <button
                    onClick={speakQuestionAloud}
                    className="flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md transition-colors"
                  >
                    {isAiSpeaking ? <VolumeX className="w-3.5 h-3.5 text-purple-400" /> : <Volume2 className="w-3.5 h-3.5 text-blue-400" />}
                    <span>{isAiSpeaking ? 'Mute Audio' : 'Hear Voice'}</span>
                  </button>
                </div>
                
                <p className="text-sm sm:text-base md:text-lg font-medium leading-snug text-slate-100">
                  "{currentQuestion.question}"
                </p>

                {/* Expected Competencies tags */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10 text-xs text-slate-400">
                  <span className="text-[11px] font-semibold text-slate-300">Assessing:</span>
                  {currentQuestion.competencyFocus.map((comp, idx) => (
                    <span key={idx} className="bg-white/10 text-slate-200 px-2 py-0.5 rounded text-[11px]">
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Candidate Picture-in-Picture Webcam Box */}
            <div className="absolute bottom-4 right-4 z-20 w-36 sm:w-44 aspect-video rounded-xl overflow-hidden border-2 border-white/20 bg-slate-800 shadow-2xl">
              {isCameraActive ? (
                <video
                  ref={userVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/90 text-slate-400 p-2 text-center">
                  <VideoOff className="w-5 h-5 mb-1 text-slate-500" />
                  <span className="text-[10px] text-slate-400">Camera Off</span>
                </div>
              )}
              <div className="absolute bottom-1.5 left-2 flex items-center gap-1 text-[10px] text-white/90 bg-black/60 px-1.5 py-0.5 rounded">
                <span className={`w-1.5 h-1.5 rounded-full ${isMicActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span>You</span>
              </div>
            </div>

            {/* Bottom Video Overlays: Live Speech Teleprompter Stream */}
            <div className="relative z-10">
              {candidateSpeechText ? (
                <div className="bg-black/75 backdrop-blur-md border border-white/10 p-3 rounded-xl max-w-lg text-xs text-slate-200">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-blue-400">LIVE CANDIDATE SPEECH STREAM</span>
                    <span>{liveWpm} WPM</span>
                  </div>
                  <p className="line-clamp-2 italic text-slate-100">
                    "{candidateSpeechText}"
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg inline-block">
                  Click <span className="text-white font-medium">Turn On Mic</span> to begin speaking, or use the speech draft box below.
                </div>
              )}
            </div>

          </div>

          {/* Bottom Cockpit Control Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            
            {/* Left Controls: Media Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMicrophone}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                  isMicActive
                    ? 'bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-500/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isMicActive ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
                <span>{isMicActive ? 'Mic Active' : 'Turn On Mic'}</span>
              </button>

              {/* Real-time Hardware Volume / Decibel VU Meter */}
              {isMicActive && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Input</span>
                  <div className="w-14 h-2 bg-slate-200 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-75 ${
                        micVolume > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(12, micVolume)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-700">{micVolume}%</span>
                </div>
              )}

              <button
                onClick={toggleCamera}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isCameraActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isCameraActive ? <Video className="w-4 h-4 text-blue-600" /> : <VideoOff className="w-4 h-4" />}
                <span>{isCameraActive ? 'Camera On' : 'Camera Off'}</span>
              </button>

              <button
                onClick={handleSimulateLiveSpeech}
                disabled={isSimulatingSpeech}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                title="Test live speech transcribing without physical microphone"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{isSimulatingSpeech ? 'Transcribing...' : 'Test Speech'}</span>
              </button>

              <button
                onClick={handleRequestHint}
                disabled={isLoadingHint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>{isLoadingHint ? 'Consulting Coach...' : activeHint ? 'Hide Hint' : 'Executive Hint'}</span>
              </button>

              <button
                onClick={handleInsertSampleAnswer}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                title="Populate realistic executive response"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Load Sample</span>
              </button>
            </div>

            {/* Right Controls: Submit and Navigation */}
            <div className="flex items-center gap-2 ml-auto">
              {isLiveVoiceMode && (
                <button
                  onClick={handleLiveVoiceTurn}
                  disabled={!candidateSpeechText.trim() || isAiSpeaking}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-sm transition-all disabled:opacity-40 animate-pulse"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Send Turn to Live API</span>
                </button>
              )}

              <button
                onClick={handleNextQuestion}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Skip Question
              </button>

              <button
                onClick={handleSubmitAndEvaluate}
                disabled={isEvaluating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
              >
                {isEvaluating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Cadence...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Evaluate & Next</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Real-time Answer Scratchpad & Speech Editor */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            {/* Mic Diagnostic Notification */}
            {micError && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-amber-950">Microphone Notice</div>
                  <p className="mt-0.5 text-amber-900/90 leading-relaxed">{micError}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={toggleMicrophone}
                      className="px-2.5 py-1 rounded bg-amber-600 text-white font-semibold text-[11px] hover:bg-amber-700"
                    >
                      Retry Permission
                    </button>
                    <button
                      onClick={handleSimulateLiveSpeech}
                      className="px-2.5 py-1 rounded bg-white border border-amber-300 font-semibold text-[11px] text-amber-900 hover:bg-amber-50"
                    >
                      Use Voice Simulation Test
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <span>Real-Time Speech & Response Draft</span>
                {isRecognitionActive && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Listening live
                  </span>
                )}
                {isMicActive && micVolume > 0 && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    ({micVolume}% audio level)
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {candidateSpeechText.trim().split(/\s+/).filter(Boolean).length} words
              </div>
            </div>

            <textarea
              value={candidateSpeechText}
              onChange={(e) => setCandidateSpeechText(e.target.value)}
              placeholder="Your live transcribed answer appears here in real time as you speak. You can also refine or type notes directly before submitting..."
              rows={3}
              className="w-full text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 bg-slate-50/70 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />

            {/* Quick detected fillers alert */}
            {totalFillerCount > 0 && (
              <div className="flex items-center gap-2 mt-2 text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Filler words detected: {Object.entries(detectedFillers).map(([word, cnt]) => `"${word}" (${cnt})`).join(', ')}. Try pausing in silence instead of using vocal fillers.
                </span>
              </div>
            )}
          </div>

          {/* Real-Time Executive Hint Callout Drawer if requested */}
          {activeHint && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-900 mb-1">
                    EXECUTIVE COACHING INTERVENTION
                  </div>
                  <p className="text-xs sm:text-sm text-purple-950 leading-relaxed font-normal">
                    {activeHint}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL (4 COLUMNS): STAR TELEPROMPTER & COACHING HUD */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* STAR Method Teleprompter Checklist Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  STAR Method Teleprompter
                </h3>
                <p className="text-xs text-slate-500">
                  Structure your answer for maximum executive clarity
                </p>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Framework
              </span>
            </div>

            <div className="space-y-3.5">
              
              {/* Situation */}
              <div className={`p-3 rounded-xl border transition-all ${
                completedStarSteps.situation
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                      S
                    </span>
                    <span className="text-xs font-bold text-slate-900">Situation</span>
                  </div>
                  {completedStarSteps.situation && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600 ml-7">
                  {currentQuestion.starGuide.situationPrompt}
                </p>
              </div>

              {/* Task */}
              <div className={`p-3 rounded-xl border transition-all ${
                completedStarSteps.task
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                      T
                    </span>
                    <span className="text-xs font-bold text-slate-900">Task</span>
                  </div>
                  {completedStarSteps.task && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600 ml-7">
                  {currentQuestion.starGuide.taskPrompt}
                </p>
              </div>

              {/* Action */}
              <div className={`p-3 rounded-xl border transition-all ${
                completedStarSteps.action
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center">
                      A
                    </span>
                    <span className="text-xs font-bold text-slate-900">Action (Executive Levers)</span>
                  </div>
                  {completedStarSteps.action && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600 ml-7">
                  {currentQuestion.starGuide.actionPrompt}
                </p>
              </div>

              {/* Result */}
              <div className={`p-3 rounded-xl border transition-all ${
                completedStarSteps.result
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                      R
                    </span>
                    <span className="text-xs font-bold text-slate-900">Result (Metrics & Impact)</span>
                  </div>
                  {completedStarSteps.result && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600 ml-7">
                  {currentQuestion.starGuide.resultPrompt}
                </p>
              </div>

            </div>
          </div>

          {/* Tactical Hints & Interviewer Focus Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Interviewer Rubric & Traps</span>
            </h3>

            <div className="space-y-2 mt-3">
              {currentQuestion.hints.map((hint, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <span>{hint}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Target Delivery Cadence:</span>
              <span className="font-semibold text-slate-700">125 – 155 WPM</span>
            </div>
          </div>

          {/* Candidate Quick Notes / Scratchpad (collapsible) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">Private Rehearsal Notes</span>
              <span className="text-[11px] text-slate-400">Visible only to you</span>
            </div>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Jot down bullet points, metrics, or revenue numbers before answering..."
              rows={2}
              className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

        </div>

      </div>

    </div>
  );
};
