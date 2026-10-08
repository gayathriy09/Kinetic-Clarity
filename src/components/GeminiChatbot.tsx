import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Copy,
  Check,
  Shield,
  Zap,
  Briefcase,
  DollarSign,
  Award,
  Mic,
  MicOff
} from 'lucide-react';
import { sendChatMessageApi, transcribeAudioApi } from '../services/geminiService';

export type ChatRolePreset = {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: any;
  defaultModel: 'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite';
  systemInstruction: string;
  samplePrompts: string[];
};

const CHAT_ROLES: ChatRolePreset[] = [
  {
    id: 'bar-raiser',
    name: 'Bar Raiser Interrogator',
    title: 'High-Stakes Probing Interviewer',
    description: 'Relentlessly challenges trade-offs, probes root causes, and demands hard dollar metrics.',
    icon: Shield,
    defaultModel: 'gemini-3.1-pro-preview',
    systemInstruction:
      'You are a demanding, skeptical Bar Raiser executive interviewer at a top-tier tech firm. Your job is to push back on vague answers, question unproven assumptions, demand specific metrics, and test executive fortitude. Never accept generic platitudes.',
    samplePrompts: [
      'I decided to cancel a 6-month project because latency was unacceptable. Interrogate my decision.',
      'How would you push back if I say our team aligned using weekly standup syncs?',
      'Test me on a crisis where a distributed database was dropping transactions during peak Black Friday sales.',
    ],
  },
  {
    id: 'executive-coach',
    name: 'Executive STAR Coach',
    title: 'Empathetic Delivery Advisor',
    description: 'Refactors answers into authoritative STAR formulations and improves leadership gravitas.',
    icon: Award,
    defaultModel: 'gemini-3.5-flash',
    systemInstruction:
      'You are a world-class Executive Interview Coach. Help the user transform their rough notes or draft answers into polished, high-altitude STAR stories. Provide constructive feedback, point out vocal filler risks, and suggest concise leadership phrasing.',
    samplePrompts: [
      'Here is my rough answer about resolving a conflict between sales and product. Please restructure it into STAR.',
      'How do I answer "What is your biggest executive failure?" without sounding incompetent or fake?',
      'Give me 3 high-impact executive verbs to replace "I helped my team organize".',
    ],
  },
  {
    id: 'case-strategist',
    name: 'Case & Strategy Partner',
    title: 'Complex Strategic Dilemmas',
    description: 'Breaks down multi-billion dollar market entry, M&A, and technical architecture cases.',
    icon: Briefcase,
    defaultModel: 'gemini-3.1-pro-preview',
    systemInstruction:
      'You are a Senior Partner at a premier management consulting firm. Guide candidates through structured hypothesis-driven problem solving, MECE frameworks, and capital allocation dilemmas.',
    samplePrompts: [
      'Walk me through a 72-hour diagnostic framework for a retail giant with 12% margin contraction.',
      'How should I structure a build vs buy case for sovereign AI infrastructure?',
      'Break down the unit economics of autonomous delivery fleets.',
    ],
  },
  {
    id: 'rapid-fire-drill',
    name: 'Rapid-Fire Drillmaster',
    title: 'Fast Cadence Training',
    description: 'Instant, rapid questions testing quick thinking and concise verbal agility.',
    icon: Zap,
    defaultModel: 'gemini-3.1-flash-lite',
    systemInstruction:
      'You are a rapid-fire interview drillmaster. Fire quick, punchy executive questions one at a time. Demand 3-sentence answers. Keep latency extremely low and energy high.',
    samplePrompts: [
      'Start the rapid-fire drill! Fire the first question.',
      'Test my speed on prioritizing tech debt vs feature delivery.',
      'Rapid-fire: How do you handle an underperforming director?',
    ],
  },
];

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
};

export const GeminiChatbot: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<ChatRolePreset>(CHAT_ROLES[0]);
  const [selectedModel, setSelectedModel] = useState<
    'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite'
  >(CHAT_ROLES[0].defaultModel);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-init',
      role: 'model',
      content: `Welcome to the executive sparring ring. I am acting as your **${CHAT_ROLES[0].name}**. I will challenge your strategic trade-offs, test your executive presence, and help you sharpen your edge. What scenario or answer would you like to drill?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribingMic, setIsTranscribingMic] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleMicRecording = async () => {
    if (isRecordingAudio) {
      setIsRecordingAudio(false);
      setIsTranscribingMic(true);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const b64 = (reader.result as string)?.split(',')[1] || '';
            if (b64) {
              const text = await transcribeAudioApi({
                audioBase64: b64,
                mimeType: mimeType.split(';')[0],
              });
              if (text) {
                setInputText((prev) => (prev ? prev + ' ' + text : text));
              }
            }
            setIsTranscribingMic(false);
          };
        };
        recorder.start(250);
        recorderRef.current = recorder;
        setIsRecordingAudio(true);
      } catch (err) {
        console.warn('Microphone error in chatbot:', err);
        setInputText("I instituted an objective decision gate to align our leadership team.");
        setIsRecordingAudio(false);
      }
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleRoleChange = (role: ChatRolePreset) => {
    setSelectedRole(role);
    setSelectedModel(role.defaultModel);
    setMessages([
      {
        id: `m-init-${Date.now()}`,
        role: 'model',
        content: `Persona switched to **${role.name}** (${role.title}).\n\n${role.description}\n\nAsk me a question or try one of the starter prompts below.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    // Call API with history
    const apiPayload = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await sendChatMessageApi({
      messages: apiPayload,
      model: selectedModel,
      systemInstruction: selectedRole.systemInstruction,
    });

    const modelMessage: Message = {
      id: `m-${Date.now()}`,
      role: 'model',
      content: response.reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, modelMessage]);
    setIsLoading(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `m-init-${Date.now()}`,
        role: 'model',
        content: `Conversation reset. I am ready as your **${selectedRole.name}**. What would you like to rehearse?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Multi-Turn Gemini Chatbot</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>Role-Specific AI Interview Sparring Partner</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Executive AI Sparring & Coaching
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Multi-turn conversation with memory, specialized persona roles, and dynamic Gemini model selection.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleClearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Thread</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Role Selector & Model Control on Left, Chat Thread on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (4 cols): Persona & Model Selector */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Persona Roles */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-purple-600" />
              <span>Choose Chatbot Role</span>
            </h3>

            <div className="space-y-2">
              {CHAT_ROLES.map((role) => {
                const isSelected = role.id === selectedRole.id;
                const IconComponent = role.icon;

                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleChange(role)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/60 shadow-xs ring-1 ring-purple-600/30'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{role.name}</div>
                        <div className="text-[11px] text-slate-500">{role.title}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Selector Card (gemini-3.1-pro-preview, gemini-3.5-flash, gemini-3.1-flash-lite) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Gemini Model Tier</span>
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Matched to task complexity & latency demands
            </p>

            <div className="space-y-2">
              <button
                onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                  selectedModel === 'gemini-3.1-pro-preview'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-mono text-[11px] text-blue-700 font-bold">gemini-3.1-pro-preview</div>
                <div className="text-[11px] text-slate-500">Complex Strategic & Case Tasks</div>
              </button>

              <button
                onClick={() => setSelectedModel('gemini-3.5-flash')}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                  selectedModel === 'gemini-3.5-flash'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-mono text-[11px] text-blue-700 font-bold">gemini-3.5-flash</div>
                <div className="text-[11px] text-slate-500">General Executive Coaching (Balanced)</div>
              </button>

              <button
                onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                  selectedModel === 'gemini-3.1-flash-lite'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-mono text-[11px] text-blue-700 font-bold">gemini-3.1-flash-lite</div>
                <div className="text-[11px] text-slate-500">Fast Rapid-Fire Q&A Drill</div>
              </button>
            </div>
          </div>

          {/* System Instruction Transparency */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Active System Instruction
            </div>
            <p className="text-slate-700 italic leading-relaxed text-[11px]">
              "{selectedRole.systemInstruction}"
            </p>
          </div>

        </div>

        {/* Right Column (8 cols): Scrollable Chat Thread */}
        <div className="lg:col-span-8 flex flex-col h-[650px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Thread Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-900">{selectedRole.name}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-[11px] font-mono text-slate-500">{selectedModel}</span>
            </div>
            <span className="text-[11px] text-slate-500">{messages.length} messages</span>
          </div>

          {/* Scrollable Message List */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] text-white'
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[82%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#2563EB] text-white rounded-tr-xs'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-xs'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Footer / Copy button */}
                    <div className={`flex items-center justify-between mt-2 pt-1 text-[10px] ${
                      isUser ? 'text-blue-100' : 'text-slate-400 border-t border-slate-200/50'
                    }`}>
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="hover:text-slate-700 flex items-center gap-1 transition-colors"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-xs p-4 text-xs text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px] font-mono text-purple-700">{selectedModel} synthesizing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Starter Prompts Bar */}
          <div className="px-5 py-2 border-t border-slate-100 bg-slate-50/30 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Prompts:</span>
            {selectedRole.samplePrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-purple-300 text-[11px] transition-colors truncate max-w-[260px]"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isRecordingAudio ? "Listening to your voice..." : isTranscribingMic ? "Transcribing speech..." : `Ask ${selectedRole.name} anything or rehearse a tough answer...`}
                className="flex-1 text-xs sm:text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900"
              />
              <button
                type="button"
                onClick={toggleMicRecording}
                disabled={isTranscribingMic}
                className={`p-2.5 rounded-xl transition-all shrink-0 ${
                  isRecordingAudio
                    ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400'
                    : isTranscribingMic
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={isRecordingAudio ? 'Stop and transcribe' : 'Speak message with microphone'}
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={isLoading || !inputText.trim() || isRecordingAudio}
                className="p-2.5 rounded-xl bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors disabled:opacity-50 shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
};
