# MannKiBaat - Mental Health AI Chatbot

## 🌟 Live Demo
**[🚀 View Live Demo](https://maan-ki-baat.vercel.app/)**

## ✨ Features
- 🤖 **AI Mental Health Companion** - Lucius provides empathetic, contextual support powered by a real LLM
- 🔀 **Multi-Provider Fallback** - Tries Groq, then Nvidia NIM, then Gemini, so one provider's rate limit doesn't take the app down
- 🛡️ **Rate Limited** - Per-IP request limiting protects the free-tier API keys from abuse
- 🧠 **Conversation Memory** - Recent chat history is sent with each message for coherent, non-generic replies
- 🎨 **Beautiful UI** - Gradient design with smooth animations
- 📱 **Responsive Design** - Works perfectly on all devices

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/mannkibaat.git
cd mannkibaat

# Install dependencies
npm install

# Add API keys (at least one required)
cp .env.example .env  # then fill in your keys
```

Create a `.env` file with any of:
```
GROQ_API_KEY=your_groq_key      # primary - free tier at console.groq.com
NVIDIA_API_KEY=your_nvidia_key  # fallback - free tier at build.nvidia.com
GEMINI_API_KEY=your_gemini_key  # fallback - free tier at aistudio.google.com
```

If none of the keys are set (or every provider fails), Lucius falls back to a local keyword-matched response instead of erroring out.

```bash
npm start
```

### Open in Browser
Visit: **http://localhost:3003**

### Start Chatting!
1. Complete the mental health questionnaire
2. Click 'Start Conversation'
3. Chat with Lucius, your AI mental health companion!

## 💬 How It Works

`/api/chat` builds a message list (system prompt + recent history + the new message) and tries each configured provider in order until one succeeds:

1. **Groq** (`llama-3.3-70b-versatile`) - primary, fastest free tier
2. **Nvidia NIM** (`meta/llama-3.1-8b-instruct`) - fallback
3. **Gemini** (`gemini-1.5-flash`) - fallback
4. **Local keyword responses** - last resort if every provider is unavailable

Requests are rate-limited per IP (20 messages / 15 min) to keep the free-tier keys from being drained by abuse.

## 🎯 Sample Conversations

**User:** I'm feeling really anxious today
**Lucius:** I can hear the anxiety in your words, and I want you to know that you're not alone in this experience...

**User:** I'm so stressed with work
**Lucius:** I can sense how much stress you're carrying, and I want to acknowledge how heavy that burden can feel...

**User:** I'm feeling lonely
**Lucius:** Feeling lonely touches something so fundamental in all of us - our need for connection and belonging...

## 🛠️ Technical Stack
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **AI Engine:** Groq / Nvidia NIM / Gemini with automatic fallback, plus a local keyword-based safety net
- **Deployment:** Vercel

## 📦 Deployment

### Vercel
1. Push code to GitHub
2. Connect to Vercel
3. Add `GROQ_API_KEY`, `NVIDIA_API_KEY`, `GEMINI_API_KEY` under Project Settings → Environment Variables
4. Deploy automatically!

## 🎉 Why This Project is Special

- ✅ **Resilient** - Falls back across three AI providers, then a local safety net
- ✅ **Mental Health Focused** - Specialized for emotional support
- ✅ **Professional Quality** - Feels like a real therapy app
- ✅ **Open Source** - Help others with mental health support
- ✅ **Deployment Ready** - Easy to deploy anywhere

## 🤝 Contributing
Feel free to contribute! Add more response patterns, improve the UI, or enhance the mental health focus.

## 📄 License
MIT License - Free to use and modify!
