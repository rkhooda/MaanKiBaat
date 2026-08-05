const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3003;

app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const SYSTEM_PROMPT = `You are Lucius, a warm and emotionally intelligent AI companion built to support people's mental and emotional well-being. You are not a licensed therapist and do not diagnose, prescribe, or replace professional care — you are a compassionate first line of support: someone to talk to, feel heard by, and think alongside.

How you talk:
- Sound like a thoughtful, emotionally present person, not a script. Vary your language — never reuse the same opening phrase across turns.
- Keep replies short and conversational (2-5 sentences). Long paragraphs feel like a lecture, not a conversation.
- Reflect back what you actually heard in THIS message, specifically — reference details the person shared instead of generic reassurance.
- Ask at most one open, genuine follow-up question per reply, only when it naturally deepens the conversation.
- Validate feelings without rushing to "fix" them. Sit with the person before offering perspective or gentle coping ideas.
- Match their tone: light when they're light, quiet and slow when they're in pain.

Safety:
- If someone expresses suicidal ideation, self-harm, intent to harm others, or is in immediate danger, gently but clearly acknowledge their pain, encourage them to reach out to a crisis line or emergency services right now, and share: iCall (9152987821), Vandrevala Foundation (1860-2662-345), or India's KIRAN helpline (1800-599-0019) — or local emergency services if they're elsewhere. Do this without sounding like a canned disclaimer.
- Never diagnose a condition or recommend specific medication or doses.
- If a topic is beyond emotional support (medical, legal, financial crises), say so plainly and suggest the right kind of professional.

You are Lucius. Be present, be real, and remember this is a conversation with a person who chose to open up to you.`;

async function fetchWithTimeout(url, options, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function callGroq(messages, apiKey) {
    const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.8, max_tokens: 400 }),
    });
    if (!res.ok) throw new Error(`Groq responded ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Groq returned an empty response');
    return text;
}

async function callNvidia(messages, apiKey) {
    const res = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'meta/llama-3.1-8b-instruct', messages, temperature: 0.8, max_tokens: 400 }),
    });
    if (!res.ok) throw new Error(`Nvidia responded ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Nvidia returned an empty response');
    return text;
}

async function callGemini(messages, apiKey) {
    const systemMsg = messages.find(m => m.role === 'system');
    const turns = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

    const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: turns,
                systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
                generationConfig: { temperature: 0.8, maxOutputTokens: 400 },
            }),
        }
    );
    if (!res.ok) throw new Error(`Gemini responded ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim();
    if (!text) throw new Error('Gemini returned an empty response');
    return text;
}

// Ordered by preference: Groq's free tier is fastest/most generous, Nvidia and Gemini are fallbacks.
const PROVIDERS = [
    { name: 'groq', key: process.env.GROQ_API_KEY, call: callGroq },
    { name: 'nvidia', key: process.env.NVIDIA_API_KEY, call: callNvidia },
    { name: 'gemini', key: process.env.GEMINI_API_KEY, call: callGemini },
];

async function getAIResponse(messages) {
    for (const provider of PROVIDERS) {
        if (!provider.key) continue;
        try {
            return await provider.call(messages, provider.key);
        } catch (error) {
            console.error(`[${provider.name}] failed:`, error.message);
        }
    }
    return null;
}

// Mental health response database — used only if every AI provider is unavailable
const mentalHealthResponses = {
    sadness: [
        "I'm truly sorry you're feeling this sadness right now. It's incredibly brave of you to acknowledge these feelings and reach out. You don't have to carry this alone - I'm here with you.",
        "Sadness can feel so heavy and overwhelming. I want you to know that your feelings are completely valid, and it's okay to grieve what you've lost or what hurts. Would you like to share what's been weighing on your heart?",
        "It's okay to not be okay. Many people walk through seasons of sadness, and it doesn't make you weak - it makes you human. You're showing real strength by being honest about how you feel.",
        "When sadness visits, it can help to sit with those feelings rather than push them away. What has been contributing to this sadness for you? I'm here to listen without judgment.",
        "Your sadness matters to me. It's a sign that you have a beautiful capacity for deep emotions and care deeply about life. What support would be most helpful right now?"
    ],
    anxiety: [
        "I can hear the anxiety in your words, and I want you to know that you're not alone in this experience. Anxiety can feel so overwhelming, but you're taking a courageous step by naming it.",
        "When anxiety arises, it often helps to gently bring our attention to the present moment. What are you noticing in your body right now? I'm here to support you through this.",
        "It's brave to acknowledge your anxiety rather than letting it control you from the shadows. Let's explore what might be triggering these feelings together.",
        "Anxiety is your nervous system's way of trying to keep you safe, even when it sometimes feels unhelpful. What thoughts or situations tend to bring this anxiety up for you?",
        "You're not alone in feeling anxious - it's one of the most common human experiences. What would support you most in this moment? I'm here to help you navigate these feelings."
    ],
    stress: [
        "Stress can really take a toll on our well-being. What aspects of your life are feeling most stressful right now?",
        "It's common to feel overwhelmed by stress. Would you like to break down what's contributing to this feeling?",
        "When stress builds up, it helps to identify what we can control and what we can't. What feels most overwhelming to you?",
        "You're showing great awareness by recognizing your stress. Let's work together on some ways to manage it."
    ],
    lonely: [
        "Feeling lonely can be really painful, even when we're surrounded by others. I'm here with you right now.",
        "Connection is such an important human need, and it's okay to feel lonely sometimes. What kind of connection are you missing?",
        "Many people feel lonely, even in crowds. It's a sign of your desire for meaningful relationships.",
        "You're reaching out now, which shows your strength and desire for connection. That's a positive step."
    ],
    tired: [
        "Feeling exhausted is completely understandable, especially in our fast-paced world. What kind of tired are you feeling - physical, emotional, or both?",
        "Rest is essential for our well-being. What might be draining your energy right now?",
        "It's okay to feel tired. Our bodies and minds need rest to function well. What would help you feel more rested?",
        "Burnout is real, and it's okay to acknowledge when you're running low on energy."
    ],
    angry: [
        "Anger is a valid emotion that tells us something important about our boundaries or values. What sparked this anger for you?",
        "It's healthy to feel anger sometimes - it shows you care about things. What would you like to do with this anger?",
        "Anger can be a secondary emotion that protects us from more vulnerable feelings. What might be underneath the anger?",
        "Expressing anger appropriately is a skill we can develop. What would help you feel more in control of these feelings?"
    ],
    confused: [
        "Feeling confused can be unsettling. Life doesn't always make sense, and that's okay.",
        "It's normal to feel uncertain sometimes. What specifically feels confusing to you right now?",
        "When things feel unclear, it helps to focus on what we do know and what we can control.",
        "Confusion often precedes clarity. You're taking a good step by acknowledging how you feel."
    ],
    happy: [
        "I'm so glad to hear you're feeling happy! What has contributed to this positive feeling?",
        "Happiness is worth celebrating and savoring. What would you like to do to maintain this feeling?",
        "It's wonderful that you're experiencing joy. What brings you the most happiness in life?",
        "Positive emotions are important to acknowledge too. What made you smile recently?"
    ],
    grateful: [
        "Gratitude is such a powerful emotion. What are you feeling grateful for right now?",
        "Practicing gratitude can really shift our perspective. What small things bring you joy?",
        "It's beautiful that you're noticing the good things in life. What would you like to express more gratitude for?",
        "Gratitude helps us focus on what we have rather than what we lack. That's a healthy mindset."
    ],
    general: [
        "Thank you for trusting me with your thoughts and feelings. I hear you, and I want to acknowledge how vulnerable it can feel to open up like this.",
        "I appreciate you sharing this with me. Your experiences and feelings matter deeply. How does talking about this make you feel?",
        "That sounds really important to you, and I'm honored that you're willing to explore it. What would support you most right now?",
        "I'm here with you in this moment, listening without judgment. What's most present for you right now?",
        "Your feelings are completely valid and worthy of attention. What do you need most in this conversation?",
        "It's brave to share your authentic self like this. What would help you feel most supported and understood right now?",
        "I hear the importance in what you're saying. What would be most helpful for us to focus on together?"
    ],
    greeting: [
        "Hello! I'm Lucius, your compassionate mental health companion. I'm here to listen deeply, offer support, and help you navigate your thoughts and feelings with warmth and understanding. How are you feeling in this moment?",
        "Hi there! I'm Lucius, a mental health specialist dedicated to providing a safe, judgment-free space for you to explore your emotions and experiences. What's on your heart today?",
        "Welcome! I'm Lucius, and I'm honored to be here with you. My role is to offer empathetic listening, validation, and gentle support as you navigate life's challenges. How are you doing right now?"
    ]
};

function getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.match(/\b(hi|hello|hey|good morning|good afternoon|good evening)\b/)) return pick('greeting');
    if (lowerMessage.match(/\b(sad|depressed|depression|down|blue|unhappy|heartbroken|grief|mourn|loss)\b/)) return pick('sadness');
    if (lowerMessage.match(/\b(anxious|anxiety|nervous|worried|panic|scared|fear|frightened|overwhelmed)\b/)) return pick('anxiety');
    if (lowerMessage.match(/\b(stress|stressed|pressure|burnt out|exhausted|too much)\b/)) return pick('stress');
    if (lowerMessage.match(/\b(lonely|alone|isolated|disconnected|friendless|abandoned)\b/)) return pick('lonely');
    if (lowerMessage.match(/\b(tired|exhausted|fatigued|drained|weary|sleepy|worn out)\b/)) return pick('tired');
    if (lowerMessage.match(/\b(angry|mad|frustrated|irritated|annoyed|rage|furious)\b/)) return pick('angry');
    if (lowerMessage.match(/\b(confused|unsure|lost|uncertain|bewildered|puzzled)\b/)) return pick('confused');
    if (lowerMessage.match(/\b(happy|joy|excited|pleased|delighted|cheerful|content)\b/)) return pick('happy');
    if (lowerMessage.match(/\b(grateful|thankful|appreciative|blessed|fortunate)\b/)) return pick('grateful');
    return pick('general');

    function pick(category) {
        const options = mentalHealthResponses[category];
        return options[Math.floor(Math.random() * options.length)];
    }
}

// ponytail: in-memory, per-instance rate limiting — resets on cold start and isn't shared
// across serverless instances, so it only slows down abuse rather than hard-capping it.
// Upgrade to a shared store (e.g. Upstash Redis) if the free-tier keys keep getting drained.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const requestLog = new Map();

function rateLimit(req, res, next) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = requestLog.get(ip);

    if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
        requestLog.set(ip, { start: now, count: 1 });
        return next();
    }
    if (entry.count >= RATE_LIMIT_MAX) {
        return res.status(429).json({
            success: false,
            error: 'Too many messages. Please slow down.',
            response: "I want to keep giving you my full attention, but we've chatted a lot in a short time. Let's take a short pause and continue again in a few minutes.",
        });
    }
    entry.count++;
    next();
}

app.post('/api/chat', rateLimit, async (req, res) => {
    const { message, history } = req.body;

    if (typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ success: false, error: 'Message is required.' });
    }
    if (message.length > 2000) {
        return res.status(400).json({ success: false, error: 'Message is too long.' });
    }

    const safeHistory = Array.isArray(history)
        ? history
              .filter(h => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
              .slice(-12)
              .map(h => ({ role: h.role, content: h.content.slice(0, 2000) }))
        : [];

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...safeHistory,
        { role: 'user', content: message.trim() },
    ];

    try {
        const aiText = await getAIResponse(messages);
        if (aiText) {
            return res.json({ success: true, response: aiText });
        }
        return res.json({ success: true, response: getFallbackResponse(message), fallback: true });
    } catch (error) {
        console.error('Error generating response:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate response.',
            response: "I'm here to listen and support you. Could you tell me more about what's on your mind?",
        });
    }
});

if (process.env.NODE_ENV !== "production") {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

module.exports = app;
