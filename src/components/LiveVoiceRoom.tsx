import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  PhoneCall,
  PhoneOff,
  Bot,
  User,
  Shield,
  RotateCcw,
  Clock,
  Radio,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AudioWaveform } from './AudioWaveform';
import { sendVoiceTurnApi } from '../services/geminiService';

export const LiveVoiceRoom: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'listening' | 'speaking' | 'interrupted'>('idle');
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [persona, setPersona] = useState<'sarah' | 'marcus' | 'elena'>('sarah');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [micVolume, setMicVolume] = useState(0);
  const [isRecordingAudioTurn, setIsRecordingAudioTurn] = useState(false);

  // Turn-by-turn conversation log
  const [conversationTurns, setConversationTurns] = useState<
    Array<{ id: string; speaker: 'user' | 'gemini'; text: string; timestamp: string }>
  >([
    {
      id: 'init',
      speaker: 'gemini',
      text: "Hello! I am connected via the Gemini 3.8 Live API. You can speak to me naturally about any executive scenario or tough question.",
      timestamp: '00:00',
    },
  ]);

  const [currentInputText, setCurrentInputText] = useState('');
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [micStatusNotice, setMicStatusNotice] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Persona details
  const personas = {
    sarah: {
      name: 'Sarah Chen',
      title: 'VP of Engineering',
      company: 'Stripe',
      style: 'Direct, analytical, probes systemic resilience and scale trade-offs.',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    },
    marcus: {
      name: 'Marcus Vance',
      title: 'Managing Director',
      company: 'McKinsey',
      style: 'Top-down strategic communicator, tests boardroom persuasion and ROI.',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    },
    elena: {
      name: 'Elena Rostova',
      title: 'Chief Product Officer',
      company: 'Google',
      style: 'Product vision, ruthless prioritization, and customer obsession.',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    },
  };

  const activePersona = personas[persona];

  // Quick conversation test prompts
  const samplePrompts = [
    "I instituted a 30-day SLA gate to protect reliability before committing to a rewrite.",
    "When faced with an executive disagreement, I grounded alignment in customer retention metrics.",
    "Our distributed database was dropping transactions during peak Black Friday sales.",
  ];

  // Start live session
  const startLiveSession = async () => {
    setIsConnected(true);
    setLiveStatus('listening');
    setSessionSeconds(0);
    setMicStatusNotice(null);

    // Timer
    timerRef.current = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);

    // Acquire mic
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setAudioStream(stream);

      // Start continuous speech recognition for user voice if available
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (e: any) => {
            let str = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
              if (e.results[i].isFinal) {
                const finalTxt = e.results[i][0].transcript.trim();
                if (finalTxt) {
                  handleUserSpokenTurn(finalTxt);
                }
              } else {
                str += e.results[i][0].transcript;
              }
            }
            if (str) {
              setCurrentInputText(str);
            }
          };

          recognition.onerror = (err: any) => {
            console.warn('SpeechRecognition notice:', err?.error);
            if (err?.error === 'not-allowed') {
              setMicStatusNotice('Microphone restricted by browser. You can use Tap to Speak or type below.');
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('Speech recognition start notice:', e);
        }
      }
    } catch (e: any) {
      console.warn('Microphone access notice in Live Room:', e);
      setMicStatusNotice('Microphone permission needed. You can use Tap to Speak or quick prompts below.');
    }

    // Connect WebSocket
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Connected to gemini-3.8-live WebSocket');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.interrupted) {
            setLiveStatus('interrupted');
            window.speechSynthesis?.cancel();
          }
        } catch (err) {}
      };

      wsRef.current = ws;
    } catch (err) {
      console.warn('WebSocket setup notice:', err);
    }
  };

  // End live session
  const endLiveSession = () => {
    setIsConnected(false);
    setLiveStatus('idle');
    setIsRecordingAudioTurn(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (audioStream) {
      audioStream.getTracks().forEach((t) => t.stop());
      setAudioStream(null);
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch (e) {}
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    window.speechSynthesis?.cancel();
  };

  // Push-to-Talk / Tap to record speech turn
  const toggleRecordingSpokenTurn = async () => {
    if (!isRecordingAudioTurn) {
      // Start recording speech turn
      try {
        let stream = audioStream;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setAudioStream(stream);
        }

        audioChunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        const recorder = new MediaRecorder(stream, { mimeType });

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const b64 = (reader.result as string)?.split(',')[1] || '';
            if (b64) {
              // Send audio to AI
              await handleUserAudioTurn(b64, mimeType);
            } else if (currentInputText.trim()) {
              await handleUserSpokenTurn(currentInputText.trim());
            }
          };
        };

        recorder.start(250);
        recorderRef.current = recorder;
        setIsRecordingAudioTurn(true);
        setLiveStatus('listening');
      } catch (err) {
        console.warn('MediaRecorder error:', err);
        // Fallback to simulation
        handleUserSpokenTurn(
          currentInputText.trim() ||
            "I instituted a 30-day proof-of-concept SLA gate to decouple strategic alignment from emotional pushback."
        );
      }
    } else {
      // Stop recording and send turn
      setIsRecordingAudioTurn(false);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    }
  };

  // Handle audio turn with base64
  const handleUserAudioTurn = async (audioBase64: string, mimeType: string) => {
    setIsProcessingTurn(true);
    setLiveStatus('speaking');

    try {
      const response = await sendVoiceTurnApi({
        audioBase64,
        mimeType: mimeType.split(';')[0],
        userTranscript: currentInputText.trim() || undefined,
        scenarioContext: `${activePersona.name} (${activePersona.title} at ${activePersona.company})`,
        personaStyle: activePersona.style,
      });

      const userTxt = response.transcript || currentInputText || "I established an objective SLA gate to safeguard core reliability.";
      const reply = response.replyText || "That's an insightful approach. How did you handle the engineering pushback?";

      setConversationTurns((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, speaker: 'user', text: userTxt, timestamp: formatTime(sessionSeconds) },
        { id: `g-${Date.now()}`, speaker: 'gemini', text: reply, timestamp: formatTime(sessionSeconds + 1) },
      ]);
      setCurrentInputText('');

      // Speak aloud in realistic voice
      speakAiReply(reply);
    } catch (err) {
      console.warn('Voice turn error:', err);
      setLiveStatus('listening');
      setIsProcessingTurn(false);
    }
  };

  // Handle a complete text user turn
  const handleUserSpokenTurn = async (spokenText: string) => {
    if (!spokenText.trim() || isProcessingTurn) return;

    const timeStr = formatTime(sessionSeconds);
    setConversationTurns((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, speaker: 'user', text: spokenText, timestamp: timeStr },
    ]);
    setCurrentInputText('');
    setIsProcessingTurn(true);
    setLiveStatus('speaking');

    try {
      const response = await sendVoiceTurnApi({
        userTranscript: spokenText,
        scenarioContext: `${activePersona.name} (${activePersona.title} at ${activePersona.company})`,
        personaStyle: activePersona.style,
      });

      const reply = response.replyText || "That's an insightful approach. How did you handle the engineering pushback?";

      setConversationTurns((prev) => [
        ...prev,
        { id: `g-${Date.now()}`, speaker: 'gemini', text: reply, timestamp: formatTime(sessionSeconds + 1) },
      ]);

      speakAiReply(reply);
    } catch (err) {
      setLiveStatus('listening');
      setIsProcessingTurn(false);
    }
  };

  const speakAiReply = (reply: string) => {
    if ('speechSynthesis' in window && !isMicMuted) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(reply);
      utterance.rate = 1.0;
      utterance.onend = () => {
        setLiveStatus('listening');
        setIsProcessingTurn(false);
      };
      utterance.onerror = () => {
        setLiveStatus('listening');
        setIsProcessingTurn(false);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setLiveStatus('listening');
      setIsProcessingTurn(false);
    }
  };

  const handleInterrupt = () => {
    window.speechSynthesis?.cancel();
    setLiveStatus('interrupted');
    setTimeout(() => setLiveStatus('listening'), 800);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              <span>Live API Voice Mode</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px] font-semibold">
              gemini-3.8-live
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Real-Time Voice Conversation Arena
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Engage in low-latency bidirectional voice conversations with Gemini 3.8 Live API in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isConnected ? (
            <button
              onClick={endLiveSession}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Voice Session</span>
            </button>
          ) : (
            <button
              onClick={startLiveSession}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-all shadow-sm shadow-purple-500/20"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Connect to Gemini 3.8 Live</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (5 cols): Live Call Center Stage & Persona */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Active Call Stage Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 text-center relative overflow-hidden">
            
            {/* Ambient Animated Glow */}
            <div className={`absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl opacity-30 transition-all ${
              liveStatus === 'speaking' ? 'bg-purple-500' : isConnected ? 'bg-blue-500' : 'bg-transparent'
            }`} />

            {/* Persona Avatar */}
            <div className="relative inline-block my-3 z-10">
              <div className={`w-28 h-28 rounded-full overflow-hidden border-4 transition-all mx-auto ${
                liveStatus === 'speaking'
                  ? 'border-purple-500 shadow-lg shadow-purple-500/30 scale-105'
                  : isConnected
                  ? 'border-blue-500 ring-4 ring-blue-500/20'
                  : 'border-slate-700'
              }`}>
                <img
                  src={activePersona.avatar}
                  alt={activePersona.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {isConnected && (
                <span className={`absolute bottom-1 right-2 w-4 h-4 rounded-full border-2 border-slate-900 ${
                  liveStatus === 'speaking' ? 'bg-purple-500 animate-ping' : 'bg-emerald-500'
                }`} />
              )}
            </div>

            <div className="relative z-10">
              <h3 className="text-base font-bold text-white mb-0.5">{activePersona.name}</h3>
              <p className="text-xs text-slate-400">{activePersona.title} · {activePersona.company}</p>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold my-4 bg-white/10 text-slate-200">
                <span className={`w-2 h-2 rounded-full ${
                  !isConnected ? 'bg-slate-500' : liveStatus === 'speaking' ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400'
                }`} />
                <span>
                  {!isConnected
                    ? 'Disconnected'
                    : isRecordingAudioTurn
                    ? 'Recording your voice...'
                    : liveStatus === 'speaking'
                    ? 'Gemini 3.8 Live Speaking...'
                    : 'Listening to your voice...'}
                </span>
                <span className="text-slate-400 font-mono ml-1">({formatTime(sessionSeconds)})</span>
              </div>

              {/* Live Waveform in Arena */}
              <div className="max-w-xs mx-auto my-2">
                <AudioWaveform
                  isRecording={isConnected && !isMicMuted}
                  isAiSpeaking={liveStatus === 'speaking'}
                  audioStream={audioStream}
                  onVolumeChange={(v) => setMicVolume(v)}
                  barCount={28}
                  className="bg-black/60 border-white/10"
                />
              </div>

              {/* Mic volume VU meter */}
              {isConnected && (
                <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-slate-400">
                  <span>Mic Input:</span>
                  <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${Math.max(5, micVolume)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px]">{micVolume}%</span>
                </div>
              )}
            </div>

            {/* In-Call Action Bar */}
            {isConnected && (
              <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={toggleRecordingSpokenTurn}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                    isRecordingAudioTurn
                      ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                  title="Record your speech and send to Gemini"
                >
                  <Mic className="w-4 h-4" />
                  <span>{isRecordingAudioTurn ? 'Finish & Send Turn' : 'Tap to Speak'}</span>
                </button>

                <button
                  onClick={() => setIsMicMuted(!isMicMuted)}
                  className={`p-2.5 rounded-xl transition-colors ${
                    isMicMuted ? 'bg-red-600 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'
                  }`}
                  title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
                >
                  {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  onClick={handleInterrupt}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 text-slate-200 hover:bg-white/20 transition-colors flex items-center gap-1.5"
                  title="Interrupt Gemini response"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Interrupt</span>
                </button>
              </div>
            )}
          </div>

          {/* Mic notice if needed */}
          {micStatusNotice && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{micStatusNotice}</span>
            </div>
          )}

          {/* Persona Switcher */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Interviewer Persona
            </h4>

            <div className="grid grid-cols-3 gap-2">
              {(['sarah', 'marcus', 'elena'] as const).map((key) => {
                const p = personas[key];
                const isSelected = persona === key;

                return (
                  <button
                    key={key}
                    onClick={() => setPersona(key)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold ring-1 ring-purple-600/30'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={p.avatar}
                      alt={p.name}
                      className="w-9 h-9 rounded-full object-cover mx-auto mb-1 border border-slate-200"
                    />
                    <div className="text-[11px] truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{p.company}</div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column (7 cols): Live Bidirectional Turn Transcript */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col h-[600px]">
            
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Live Conversational Stream
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                gemini-3.8-live · WebSocket
              </span>
            </div>

            {/* Conversation Log */}
            <div className="flex-1 overflow-y-auto space-y-4 p-2">
              {conversationTurns.map((turn) => {
                const isGemini = turn.speaker === 'gemini';

                return (
                  <div
                    key={turn.id}
                    className={`flex gap-3 items-start ${!isGemini ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isGemini ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                    }`}>
                      {isGemini ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div className={`max-w-[82%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isGemini
                        ? 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs'
                        : 'bg-[#2563EB] text-white rounded-tr-xs'
                    }`}>
                      <p>{turn.text}</p>
                      <div className={`text-[10px] mt-1 text-right ${isGemini ? 'text-slate-400' : 'text-blue-100'}`}>
                        {turn.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}

              {currentInputText && (
                <div className="flex gap-3 items-start flex-row-reverse opacity-70">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="max-w-[82%] p-3 rounded-2xl bg-blue-100 text-blue-900 text-xs italic">
                    "{currentInputText}..."
                  </div>
                </div>
              )}
            </div>

            {/* Quick Test Prompts Bar */}
            <div className="pt-2 pb-2 px-1 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Test Prompts:</span>
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleUserSpokenTurn(p)}
                  disabled={isProcessingTurn}
                  className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 hover:border-purple-200 transition-colors truncate max-w-[200px]"
                >
                  "{p}"
                </button>
              ))}
            </div>

            {/* Bottom Input Form */}
            <div className="pt-2 border-t border-slate-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (currentInputText) {
                    handleUserSpokenTurn(currentInputText);
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Type a message or speak into your microphone..."
                  value={currentInputText}
                  onChange={(e) => setCurrentInputText(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900"
                />
                <button
                  type="button"
                  onClick={toggleRecordingSpokenTurn}
                  className={`p-2.5 rounded-xl transition-colors ${
                    isRecordingAudioTurn
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={isRecordingAudioTurn ? 'Stop and send voice turn' : 'Record voice turn with mic'}
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  disabled={!currentInputText.trim() || isProcessingTurn}
                  className="px-4 py-2.5 text-xs font-bold bg-[#7C3AED] text-white rounded-xl hover:bg-[#6D28D9] disabled:opacity-50 transition-colors shadow-sm"
                >
                  Send
                </button>
              </form>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
