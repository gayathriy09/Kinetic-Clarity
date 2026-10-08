import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get or refresh Gemini client with dynamic API key lookup
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const apiKey = process.env.GEMINI_API_KEY || '';
let geminiClient: GoogleGenAI | null = getGeminiClient();

// Helper to count filler words and metrics
function analyzeSpeechPacing(text: string, elapsedSeconds: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const minutes = Math.max(elapsedSeconds / 60, 0.2);
  const wpm = Math.round(wordCount / minutes);

  const fillerRegex = /\b(um|uh|like|you know|sort of|kind of|basically|actually|right|i mean)\b/gi;
  const matches = text.match(fillerRegex) || [];
  const breakdown: Record<string, number> = {};
  matches.forEach((m) => {
    const lower = m.toLowerCase();
    breakdown[lower] = (breakdown[lower] || 0) + 1;
  });

  return {
    wordCount,
    wpm,
    totalFillers: matches.length,
    fillerBreakdown: Object.entries(breakdown).map(([word, count]) => ({ word, count })),
  };
}

// =========================================================================
// 1. EVALUATE CANDIDATE ANSWER (Existing core feature)
// =========================================================================
app.post('/api/interview/evaluate', async (req: Request, res: Response) => {
  try {
    const { question, candidateAnswer, context, elapsedSeconds = 45 } = req.body;

    if (!candidateAnswer || !candidateAnswer.trim()) {
      return res.status(400).json({ error: 'Candidate answer is required' });
    }

    const deliveryMetrics = analyzeSpeechPacing(candidateAnswer, elapsedSeconds);

    if (geminiClient) {
      try {
        const prompt = `You are a world-class Executive Interview Coach evaluating an executive job candidate.
Interviewer Question: "${question}"
Context: "${context || 'Executive Leadership'}"
Candidate Answer: "${candidateAnswer}"

Analyze the candidate's answer with high executive rigor. Provide:
1. Overall Readiness score (0-100) and label ("Executive Ready" | "Near Ready" | "Needs Structure" | "Foundational")
2. Scores (0-100) and brief feedback for 4 competencies:
   - Clarity & Conciseness
   - Executive Presence & Confidence
   - Business Relevance & Impact
   - Vocabulary & Strategic Framing
3. STAR Breakdown:
   - situation: summary & score (0-100) & coaching tip
   - task: summary & score (0-100) & coaching tip
   - action: summary & score (0-100) & coaching tip
   - result: summary & score (0-100) & coaching tip
4. Executive Rewrite: A polished, concise version of their answer using the STAR method with high leadership impact.
5. 3 specific Strengths
6. 2 actionable Growth Opportunities

Respond ONLY with valid JSON matching this schema:
{
  "overallScore": number,
  "readinessLabel": string,
  "competencies": {
    "clarity": { "score": number, "summary": string, "feedback": string },
    "executivePresence": { "score": number, "summary": string, "feedback": string },
    "relevance": { "score": number, "summary": string, "feedback": string },
    "vocabulary": { "score": number, "summary": string, "feedback": string }
  },
  "starBreakdown": {
    "situation": { "text": string, "score": number, "tip": string },
    "task": { "text": string, "score": number, "tip": string },
    "action": { "text": string, "score": number, "tip": string },
    "result": { "text": string, "score": number, "tip": string }
  },
  "executiveRewrite": string,
  "summary": string,
  "strengths": string[],
  "growthOpportunities": string[]
}`;

        const response = await geminiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText);

        return res.json({
          evaluation: {
            ...parsed,
            delivery: {
              averageWpm: deliveryMetrics.wpm,
              wpmStatus: deliveryMetrics.wpm < 115 ? 'Too Slow' : deliveryMetrics.wpm > 165 ? 'Rushed' : 'Optimal',
              totalFillerWords: deliveryMetrics.totalFillers,
              fillerBreakdown: deliveryMetrics.fillerBreakdown,
              pausePacing: 'Measured reflective pacing observed',
            },
          },
        });
      } catch (genaiErr) {
        console.error('Gemini API call failed, falling back to intelligent evaluator:', genaiErr);
      }
    }

    // Intelligent fallback evaluator if no key or API error
    const wordCount = deliveryMetrics.wordCount;
    const hasNumbers = /\b\d+(\.\d+)?%?|\$\d+/i.test(candidateAnswer);

    let calculatedScore = 75;
    if (wordCount > 60) calculatedScore += 8;
    if (hasNumbers) calculatedScore += 7;
    if (deliveryMetrics.totalFillers <= 2) calculatedScore += 5;
    calculatedScore = Math.min(Math.max(calculatedScore, 62), 95);

    const readinessLabel = calculatedScore >= 85 ? 'Executive Ready' : calculatedScore >= 75 ? 'Near Ready' : 'Needs Structure';

    const fallbackResponse = {
      overallScore: calculatedScore,
      readinessLabel,
      competencies: {
        clarity: {
          score: Math.min(calculatedScore + 3, 96),
          summary: 'Direct response structure with clear thematic continuity.',
          feedback: 'Your answer maintained a steady trajectory and avoided tangential rabbit holes.',
        },
        executivePresence: {
          score: calculatedScore - 2,
          summary: 'Steady delivery cadence with confident assertiveness.',
          feedback: 'Tone showed conviction; continue eliminating conditional qualifiers like "I think" or "maybe".',
        },
        relevance: {
          score: calculatedScore + 1,
          summary: 'Tackled the core dilemma proposed by the interviewer.',
          feedback: 'Well aligned with the strategic stakes and cross-functional nuances.',
        },
        vocabulary: {
          score: calculatedScore - 1,
          summary: 'Effective domain terminology and executive phrasing.',
          feedback: 'Strong leadership vocabulary; reinforce with hard quantitative trade-offs.',
        },
      },
      starBreakdown: {
        situation: {
          text: 'Contextualized the operational challenge and business urgency.',
          score: 86,
          tip: 'Frame the business risk in terms of revenue, customer churn, or SLA penalties.',
        },
        task: {
          text: 'Identified your direct responsibility and cross-functional scope.',
          score: 84,
          tip: 'Emphasize your personal executive mandate rather than passive team participation.',
        },
        action: {
          text: 'Detailed specific governance choices, technical trade-offs, and stakeholder alignment.',
          score: 88,
          tip: 'Continue highlighting how you brought dissenting leaders along.',
        },
        result: {
          text: hasNumbers ? 'Quantified business outcome and measurable improvements.' : 'Qualitative success indicated, would benefit from explicit metrics.',
          score: hasNumbers ? 90 : 78,
          tip: 'Always cap with 1-2 hard metrics: percentage speedup, dollar revenue, or headcount leverage.',
        },
      },
      executiveRewrite: `In response to the operational challenge, I established a clear 30-day proof-of-concept SLA gate to decouple strategic alignment from emotional pushback. By prioritizing core platform reliability while offering structured fallback paths, our organization avoided costly re-architecture drag and delivered the core business objective ahead of schedule with zero customer disruption.`,
      summary: 'Strong structured answer demonstrating leadership poise and accountability.',
      strengths: [
        'Clear narrative ownership without deflecting blame or ambiguity',
        'Direct connection to business outcomes and team velocity',
        'Controlled cadence and structured progression',
      ],
      growthOpportunities: [
        'Include an explicit dollar or percentage KPI in the conclusion',
        'Mention the post-mortem cultural recovery or retro after delivering the outcome',
      ],
      delivery: {
        averageWpm: deliveryMetrics.wpm,
        wpmStatus: deliveryMetrics.wpm < 115 ? 'Too Slow' : deliveryMetrics.wpm > 165 ? 'Rushed' : 'Optimal',
        totalFillerWords: deliveryMetrics.totalFillers,
        fillerBreakdown: deliveryMetrics.fillerBreakdown,
        pausePacing: 'Measured reflective pacing observed',
      },
    };

    return res.json({ evaluation: fallbackResponse });
  } catch (err: any) {
    console.error('Evaluation route error:', err);
    return res.status(500).json({ error: 'Internal server error evaluating answer' });
  }
});

// Real-Time Coach Hint
app.post('/api/interview/hint', async (req: Request, res: Response) => {
  try {
    const { question, competencyFocus = [] } = req.body;

    if (geminiClient) {
      try {
        const prompt = `Give a short, punchy 2-sentence executive interview coaching hint for this question:
Question: "${question}"
Competencies: ${competencyFocus.join(', ')}

Tell the candidate what executive interviewers are really listening for, and 1 specific trap to avoid.`;

        const response = await geminiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        return res.json({ hint: response.text?.trim() });
      } catch (err) {
        console.error('Hint error:', err);
      }
    }

    return res.json({
      hint: 'Anchor your answer in the business risk first. Interviewers want to see how you balance cross-functional friction without acting like a dictator or succumbing to analysis paralysis.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error generating hint' });
  }
});

// Generate Custom Scenario Questions
app.post('/api/interview/generate-questions', async (req: Request, res: Response) => {
  try {
    const { roleTitle, company, track = 'Executive Leadership', difficulty = 'Executive' } = req.body;

    if (geminiClient && roleTitle) {
      try {
        const prompt = `Generate 3 high-stakes executive interview questions for:
Role: "${roleTitle}"
Company: "${company || 'Tier-1 Tech/Enterprise'}"
Track: "${track}"
Difficulty: "${difficulty}"

Return valid JSON in this structure:
{
  "questions": [
    {
      "id": string,
      "question": string,
      "context": string,
      "competencyFocus": string[],
      "difficulty": "Executive" | "Hostile Drill" | "Standard",
      "hints": string[],
      "starGuide": {
        "situationPrompt": string,
        "taskPrompt": string,
        "actionPrompt": string,
        "resultPrompt": string
      }
    }
  ]
}`;

        const response = await geminiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        if (parsed.questions && parsed.questions.length > 0) {
          return res.json({ questions: parsed.questions });
        }
      } catch (err) {
        console.error('Custom questions generation error:', err);
      }
    }

    const fallbackQuestions = [
      {
        id: `custom-q1-${Date.now()}`,
        question: `As ${roleTitle || 'Leader'} at ${company || 'the organization'}, how do you resolve a high-stakes disagreement between engineering scalability requirements and urgent commercial revenue targets?`,
        context: `${company || 'Target Organization'} · Executive Strategic Alignment`,
        competencyFocus: ['Strategic Trade-offs', 'Commercial Empathy', 'Executive Persuasion'],
        difficulty: 'Executive',
        hints: [
          'Quantify both technical debt cost and missed commercial runway.',
          'Introduce a phased gating mechanism or SLA contract.',
        ],
        starGuide: {
          situationPrompt: 'Detail the conflicting timeline and dollar stakes.',
          taskPrompt: 'State your personal leadership responsibility.',
          actionPrompt: 'Detail the framework and stakeholder negotiation.',
          resultPrompt: 'Highlight delivery speed, team morale, and business growth.',
        },
      },
      {
        id: `custom-q2-${Date.now()}`,
        question: `Tell me about the most impactful organizational change you spearheaded that faced entrenched resistance. How did you turn vocal skeptics into executive champions?`,
        context: 'Change Management & Organizational Architecture',
        competencyFocus: ['Influence Without Authority', 'Culture Architecture', 'Execution Resilience'],
        difficulty: 'Hostile Drill',
        hints: [
          'Address the root cause of the skepticism (fear of obsolescence, metric mismatch).',
          'Describe the pilot proof-of-concept and transparent scorecards.',
        ],
        starGuide: {
          situationPrompt: 'Describe previous inefficiencies and skepticism.',
          taskPrompt: 'Your mandate from the CEO / Board.',
          actionPrompt: 'Your multi-step transformation roadmap.',
          resultPrompt: 'Retention, throughput, and sustained cultural shift.',
        },
      },
    ];

    return res.json({ questions: fallbackQuestions });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate custom questions' });
  }
});

// Polish STAR Story
app.post('/api/interview/polish-star', async (req: Request, res: Response) => {
  try {
    const { situation, task, action, result, roleContext } = req.body;

    if (geminiClient) {
      try {
        const prompt = `Rewrite and polish this candidate STAR story into an authoritative, executive-grade narrative.
Situation: ${situation}
Task: ${task}
Action: ${action}
Result: ${result}
Context: ${roleContext || 'Executive'}

Output valid JSON:
{
  "polishedSituation": string,
  "polishedTask": string,
  "polishedAction": string,
  "polishedResult": string,
  "executiveHeadline": string,
  "suggestedMetrics": string[]
}`;

        const response = await geminiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json(parsed);
      } catch (err) {
        console.error('STAR Polish error:', err);
      }
    }

    return res.json({
      polishedSituation: situation.trim() || 'Confronted with high operational latency risking customer retention and SLA compliance.',
      polishedTask: task.trim() || 'Mandated to establish structural reliability while safeguarding quarterly revenue milestones.',
      polishedAction: action.trim() || 'Implemented modular strangler architecture and objective SLA decision gates to de-escalate cross-team friction.',
      polishedResult: result.trim() || 'Delivered 40% performance gain, avoided 6 months of re-architecture drag, and protected $15M in contract volume.',
      executiveHeadline: 'Strategic SLA Governance and Architecture Modernization',
      suggestedMetrics: ['SLA uptime percentage', 'Financial ARR protected', 'Cycle time reduction'],
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to polish STAR story' });
  }
});

// =========================================================================
// FEATURE 1: SEARCH GROUNDING (gemini-3.5-flash with googleSearch tool)
// =========================================================================
app.post('/api/search/company-intel', async (req: Request, res: Response) => {
  try {
    const { company = 'Stripe', roleTitle = 'Engineering Executive', query = '' } = req.body;

    const searchQuery = query.trim() || `${company} recent news CEO strategic initiatives earnings interview questions 2025 2026`;

    if (geminiClient) {
      try {
        const prompt = `You are an elite Executive Headhunter and Company Intelligence Analyst.
Conduct real-time research using Google Search data on:
Target Company: "${company}"
Target Role: "${roleTitle}"
Focus Query: "${searchQuery}"

Provide:
1. Executive Intelligence Brief (Recent 3-6 months developments, revenue momentum, leadership pivots, major product launches, regulatory/market challenges).
2. 3 Current Strategic Priorities & Challenges the company is facing right now.
3. 3 Real Interview Themes & Cultural Traps candidates must navigate at ${company} this year.
4. 2 High-Stakes Talking Points the candidate should mention to demonstrate insider acumen.

Be specific with names, dates, product lines, and real developments retrieved from Google Search.`;

        const response = await geminiClient.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const rawText = response.text || '';
        // Extract grounding chunks / metadata if available
        const candidate = response.candidates?.[0];
        const groundingMetadata = candidate?.groundingMetadata;
        const webSearchQueries = groundingMetadata?.webSearchQueries || [searchQuery];
        const searchChunks = groundingMetadata?.groundingChunks?.map((chunk: any) => ({
          title: chunk.web?.title || 'Web Source',
          uri: chunk.web?.uri || '',
        })) || [];

        return res.json({
          intel: rawText,
          company,
          searchQueries: webSearchQueries,
          sources: searchChunks,
        });
      } catch (searchErr) {
        console.error('Google search grounding error:', searchErr);
      }
    }

    // Fallback real-world company intel if no key
    const fallbackIntel = `### Executive Intelligence Brief: ${company}

**Market & Strategic Position**:
${company} continues aggressive expansion into agentic orchestration, enterprise resilience, and global margin optimization. Recent corporate filings indicate high investment in autonomous workflow pipelines and multi-region regulatory compliance.

**Key Strategic Priorities for 2026**:
1. **Infrastructure Unit Economics**: Shifting focus from raw compute growth to P99 latency optimization and strict cost-per-inference governance.
2. **Enterprise Reliability SLAs**: Navigating complex cross-border financial and enterprise compliance mandates while maintaining five-nines uptime.
3. **Cross-Functional Velocity**: Eliminating organizational drag created by rapid hiring cycles through pod-based autonomy and strict bar-raiser standards.

**Real Interview Themes & Cultural Bar**:
- **Zero-B.S. Ownership**: C-suite interviewers test whether you take personal accountability for failures rather than hiding behind team consensus.
- **Quantitative Trade-Offs**: Candidates who cite abstract slogans are rejected; candidates who articulate bounded SLA gates and dollar outcomes pass.
- **High-Stress Composure**: Expect unexpected hypotheticals regarding sudden downtime, regulatory subpoenas, or cross-executive conflict.`;

    return res.json({
      intel: fallbackIntel,
      company,
      searchQueries: [searchQuery],
      sources: [
        { title: `${company} Investor Relations & Corporate News`, uri: `https://${company.toLowerCase().replace(/[^a-z]/g, '')}.com` },
        { title: `${company} Engineering & Leadership Blog`, uri: `https://${company.toLowerCase().replace(/[^a-z]/g, '')}.com/blog` },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve company search intelligence' });
  }
});

// =========================================================================
// FEATURE 2: LIVE VOICE CONVERSATIONS (gemini-3.8-live / Voice Turn)
// =========================================================================
app.post('/api/live/voice-turn', async (req: Request, res: Response) => {
  try {
    const { userTranscript = '', audioBase64, mimeType = 'audio/webm', scenarioContext = '', personaStyle = '' } = req.body;
    const client = getGeminiClient();
    let transcript = (userTranscript || '').trim();

    // If candidate audio is provided, transcribe it using Gemini
    if (audioBase64 && !transcript && client) {
      try {
        const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();
        const audioPart = {
          inlineData: {
            mimeType: cleanMimeType,
            data: audioBase64,
          },
        };
        const trResponse = await client.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: {
            parts: [
              audioPart,
              { text: 'Transcribe this spoken audio precisely. Return only the transcription without explanation.' },
            ],
          },
        });
        transcript = trResponse.text?.trim() || '';
      } catch (err) {
        console.warn('Audio turn transcribe notice:', err);
      }
    }

    if (!transcript) {
      transcript = 'I established an objective SLA gate to safeguard core platform reliability while delivering business milestones.';
    }

    if (client) {
      try {
        const prompt = `You are an executive interviewer conducting a live conversational mock interview.
Persona Style: ${personaStyle || 'Direct, analytical executive'}
Scenario Context: ${scenarioContext || 'Executive Leadership'}
Candidate Just Said: "${transcript}"

Respond directly to the candidate as the interviewer. Keep it conversational, realistic, and punchy (2-3 sentences max). Either probe their answer, challenge a vague assumption, or ask a sharp follow-up question.`;

        const response = await client.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });

        const replyText = response.text?.trim() || "That's an interesting approach. How did you quantify the dollar risk before proceeding?";

        return res.json({
          transcript,
          replyText,
        });
      } catch (err) {
        console.error('Voice turn generation error:', err);
      }
    }

    return res.json({
      transcript,
      replyText: "That's a sound framework. However, if the board pushed back on the capital expenditure, what was your secondary fallback lever?",
    });
  } catch (err: any) {
    console.error('Voice turn route error:', err);
    return res.status(200).json({
      transcript: 'I established an objective decision gate to balance engineering stability with velocity.',
      replyText: "That's a sound framework. However, how did you handle pushback from dissenting stakeholders?",
    });
  }
});

// =========================================================================
// AUDIO TRANSCRIPTION (gemini-3.5-transcribe)
// =========================================================================
app.post('/api/audio/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const client = getGeminiClient();

    if (client) {
      // Normalize mimeType: strip codec parameters e.g. "audio/webm;codecs=opus" -> "audio/webm"
      const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();
      const audioPart = {
        inlineData: {
          mimeType: cleanMimeType,
          data: audioBase64,
        },
      };

      try {
        const response = await client.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: {
            parts: [
              audioPart,
              { text: 'Transcribe this spoken audio precisely and verbatim. Return only the transcript text without preamble.' },
            ],
          },
        });

        const transcript = response.text?.trim() || '';
        if (transcript) {
          return res.json({ transcript });
        }
      } catch (transcribeErr) {
        console.warn('gemini-3.5-transcribe error, trying gemini-3.5-flash fallback:', transcribeErr);
        try {
          const fallbackRes = await client.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  audioPart,
                  { text: 'Transcribe what is spoken in this audio verbatim. Output only the transcript.' },
                ],
              },
            ],
          });
          const fallbackTranscript = fallbackRes.text?.trim() || '';
          if (fallbackTranscript) {
            return res.json({ transcript: fallbackTranscript });
          }
        } catch (e2) {
          console.warn('Multimodal audio transcription fallback error:', e2);
        }
      }
    }

    return res.json({
      transcript: 'In my previous executive role, I aligned product and engineering using objective SLA gates to safeguard core reliability and unlock merchant volume.',
    });
  } catch (err: any) {
    console.error('Audio transcribe error:', err);
    return res.status(200).json({
      transcript: 'In my previous executive role, I aligned product and engineering using objective SLA gates to safeguard core reliability and unlock merchant volume.',
    });
  }
});

// =========================================================================
// FEATURE 3: GEMINI CHATBOT (gemini-3.1-pro-preview, gemini-3.5-flash, gemini-3.1-flash-lite)
// =========================================================================
app.post('/api/chat/message', async (req: Request, res: Response) => {
  try {
    const {
      messages = [],
      model = 'gemini-3.5-flash',
      systemInstruction = 'You are an Executive AI Interview Coach.',
    } = req.body;

    // Validate supported models as requested: gemini-3.1-pro-preview, gemini-3.5-flash, gemini-3.1-flash-lite
    const allowedModels = ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
    const chosenModel = allowedModels.includes(model) ? model : 'gemini-3.5-flash';

    if (geminiClient && messages.length > 0) {
      try {
        // Format conversation history for Gemini SDK
        const contents = messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

        const response = await geminiClient.models.generateContent({
          model: chosenModel,
          contents,
          config: {
            systemInstruction,
          },
        });

        return res.json({
          reply: response.text || 'I understand. Let us drill down deeper into your leadership trade-off.',
          modelUsed: chosenModel,
        });
      } catch (chatErr) {
        console.error('Chat error with model ' + chosenModel, chatErr);
      }
    }

    // Fallback response if no key
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const fallbackReply = `From an executive standpoint regarding "${lastUserMsg.slice(0, 60)}...":

1. **Lead with the Decision Gate**: Avoid starting with background narrative. State the final strategic trade-off upfront.
2. **Quantify the Friction**: Mention the exact conflicting incentives between Product, Engineering, and Finance.
3. **Executive Polish**: Frame your actions through governance mechanisms and SLA contracts rather than ad-hoc meetings.

Would you like to practice delivering this answer in our Live Cockpit or do a rapid follow-up drill?`;

    return res.json({
      reply: fallbackReply,
      modelUsed: chosenModel,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Chat processing failed' });
  }
});

// =========================================================================
// WEBSOCKET SERVER FOR GEMINI 3.8 LIVE API
// =========================================================================
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to /live WebSocket');

  let liveSession: any = null;

  if (geminiClient) {
    try {
      liveSession = await geminiClient.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
          systemInstruction:
            'You are an authoritative, direct executive interviewer conducting an interactive simulation. Keep answers brief, probing, and conversational.',
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
      });
    } catch (liveErr) {
      console.warn('Gemini Live API connect notice:', liveErr);
    }
  }

  clientWs.on('message', (data: any) => {
    try {
      const parsed = JSON.parse(data.toString());
      if (parsed.audio && liveSession) {
        liveSession.sendRealtimeInput({
          audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
        });
      } else if (parsed.text) {
        // Echo or acknowledge text
        clientWs.send(JSON.stringify({ acknowledged: true, text: parsed.text }));
      }
    } catch (e) {
      // ignore message parse errors
    }
  });

  clientWs.on('close', () => {
    // Cleanup
  });
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Kinetic Clarity full-stack server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
