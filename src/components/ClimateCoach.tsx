import React, { useState, useEffect, useRef } from "react";
import { ChatSession, ChatMessage } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, doc, setDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { Bot, User, Send, Compass, HelpCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";

interface ClimateCoachProps {
  userId: string;
}

const QUICK_STARTERS = [
  "What are the top 3 highest impact actions to reduce carbon footprint?",
  "Analyze the difference in footprint between driving electric vs public transit.",
  "Which diet offers the lowest carbon exhaust, and what are reasonable substitutes?",
  "How can I set a 1-year carbon reduction budget for my family?",
];

export default function ClimateCoach({ userId }: ClimateCoachProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const endRef = useRef<HTMLDivElement>(null);

  // Active chat session ID (generate once or use a generic single session per user for simplicity)
  const sessionId = "session_default_ai_coach";

  useEffect(() => {
    // Scroll chat to the base whenever new message appends
    setTimeout(() => {
      if (endRef.current && typeof endRef.current.scrollIntoView === "function") {
        endRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  }, [messages, loading]);

  useEffect(() => {
    if (!userId) return;

    // Real-time listener for user private Chat Messages
    const path = `users/${userId}/chats/${sessionId}/messages`;
    const q = query(collection(db, "users", userId, "chats", sessionId, "messages"), orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedMessages: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          loadedMessages.push(doc.data() as ChatMessage);
        });
        setMessages(loadedMessages);

        // Seed with a welcoming greeting from AI coach if chat is empty
        if (loadedMessages.length === 0) {
          seedWelcomeMessage();
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const seedWelcomeMessage = async () => {
    const welcomeId = "welcome_" + Date.now();
    const systemSessionRef = doc(db, "users", userId, "chats", sessionId);
    
    // Set up chat session object
    const sessionData: ChatSession = {
      sessionId,
      userId,
      title: "Climate Coaching Dialog",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(systemSessionRef, sessionData);

    const welcomeMsg: ChatMessage = {
      messageId: welcomeId,
      userId,
      role: "model",
      content: `Hello! I am your CarbonPilot AI Climate Coach. 🌿
I am here to analyze your carbon ledger, help you complete sustainability challenges, and deliver personal guidance to reduce footprints.

What ecological questions can I solve for you today? Choose a quick starter below or type your enquiry!`,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", userId, "chats", sessionId, "messages", welcomeId), welcomeMsg);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setLoading(true);
    setError(null);
    setInputText("");

    // Create prompt message Object
    const userMsgId = "user_" + Date.now();
    const userMsg: ChatMessage = {
      messageId: userMsgId,
      userId,
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    try {
      // 1. Save user prompt inside firestore messages
      await setDoc(doc(db, "users", userId, "chats", sessionId, "messages", userMsgId), userMsg);

      // 2. Query Express server-side route
      // Build brief history to allow contextual understanding
      const coachHistory = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const res = await fetch("/api/gemini/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: coachHistory,
        }),
      });

      if (!res.ok) {
        throw new Error("Climate API failed to respond. Please try again.");
      }

      const data = await res.json();

      // 3. Save assistant response into firestore
      const modelMsgId = "model_" + Date.now();
      const modelMsg: ChatMessage = {
        messageId: modelMsgId,
        userId,
        role: "model",
        content: data.text || "I was unable to formulate a response.",
        timestamp: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", userId, "chats", sessionId, "messages", modelMsgId), modelMsg);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="coach_chat_panel" className="bg-bg-card rounded-[32px] overflow-hidden shadow-sm border border-border-brand flex flex-col h-[600px] theme-transition">
      {/* Header info */}
      <div className="p-5 border-b border-border-brand bg-brand-secondary/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary flex items-center justify-center text-white">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">
              Personal Climate Coach
            </h3>
            <span className="text-xs text-brand-primary font-medium">
              Powered by CarbonPilot AI
            </span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.messageId}
            className={`flex gap-3 max-w-[85%] ${
              msg.role === "user" ? "ml-auto flex-row-reverse" : ""
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                msg.role === "user"
                  ? "bg-brand-secondary text-brand-dark font-bold"
                  : "bg-brand-teal text-brand-dark font-bold"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`p-4 rounded-3xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand-secondary text-brand-dark rounded-tr-none border border-border-brand/40"
                  : "bg-brand-bg text-text-primary rounded-tl-none border border-border-brand/50 whitespace-pre-line"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 mr-auto max-w-[85%]">
            <div className="w-8 h-8 rounded-xl bg-brand-teal flex items-center justify-center text-brand-dark font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-4 rounded-3xl text-sm bg-brand-bg border border-border-brand text-text-secondary flex items-center gap-2">
              <span>Formulating climate recommendations...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl text-xs text-center border border-red-100">
            {error}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Suggested chips panels inside keyboard boundary */}
      {messages.length < 5 && (
        <div className="px-5 py-2.5 border-t border-border-brand bg-brand-bg/50">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-2 font-medium">
            <HelpCircle className="w-3.5 h-3.5 text-brand-primary" />
            <span>Click to ask CarbonPilot instant suggestions:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_STARTERS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(s)}
                className="text-xs text-text-secondary bg-bg-card hover:text-brand-primary hover:bg-brand-secondary/40 px-3 py-1.5 rounded-full border border-border-brand transition-all text-left cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input container */}
      <div className="p-4 border-t border-border-brand bg-bg-card theme-transition">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          className="flex gap-2"
        >
          <label htmlFor="coach_message_input" className="sr-only">
            Ask climate coach environmental inquiry
          </label>
          <input
            id="coach_message_input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            placeholder="Ask climate coach, e.g., how do I start washing clothes cleaner?"
            className="flex-1 bg-brand-bg hover:bg-brand-bg/80 border border-border-brand rounded-2xl px-5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary text-text-primary transition-all"
          />
          <button
            id="coach_submit_btn"
            type="submit"
            disabled={!inputText.trim() || loading}
            aria-label="Send message to climate coach"
            className="p-3.5 bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-40 text-white rounded-2xl shadow-sm transition-all flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
