import React, { useState, useEffect, useRef } from "react";
// @ts-ignore
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Gift,
  Heart,
  Users,
  Flame,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  HelpCircle,
  Play,
  Square,
  MessageSquare,
  ArrowLeft,
  Tv,
  LogOut,
  Sparkle
} from "lucide-react";

// @ts-ignore
import avatarImg from "./assets/images/lumina_pleng_avatar_1783108036980.jpg";
// @ts-ignore
import playgroundBg from "./assets/images/playground_background_1783109045951.jpg";

interface Message {
  id: string;
  sender: "user" | "lumina" | "system";
  text: string;
  username: string;
  avatar: string;
  mood?: string;
  timestamp: string;
  isGift?: boolean;
  giftType?: string;
}

interface SimulatedComment {
  id: string;
  username: string;
  text: string;
  avatar: string;
}

export default function App() {
  // --- Gate Setup Screen States ---
  const [userJoined, setUserJoined] = useState(false);
  const [userNickname, setUserNickname] = useState("");
  const [userAvatar, setUserAvatar] = useState("😎");

  // --- Live stream States ---
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "system",
      username: "SYSTEM",
      avatar: "📢",
      text: "LuminaPleng sedang live! AI babi hutan pink paling toxic, sarkas, tapi jenius se-Indonesia siap melayani keluh kesah dan tugas dongo lu, cuakss!",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [simulatedComments, setSimulatedComments] = useState<SimulatedComment[]>([]);

  const [isThinking, setIsThinking] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<{ reply: string; mood: string } | null>({
    reply: "Oi peler! Masuk juga lu ke live gue. Mau curhat karena cinta lu ditolak atau mau nanya tugas sekolah karena otak lu ga sanggup? Ngomong buruan, mumpung gue lagi baek, cuakss!",
    mood: "sarkas",
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceOnlyMode, setIsVoiceOnlyMode] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; scale: number; left: number; duration: number; color: string; emoji: string }[]>([]);
  const [viewerCount, setViewerCount] = useState(14850);
  const [likesCount, setLikesCount] = useState(38900);
  const [giftOverlay, setGiftOverlay] = useState<{ type: string; text: string; active: boolean } | null>(null);
  const [speechTranscript, setSpeechTranscript] = useState("");

  // References
  const chatEndRef = useRef<HTMLDivElement>(null);
  const commentEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const heartIdCounter = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Suggested preset avatars for the Gate Setup screen
  const AVATAR_PRESETS = ["😎", "👤", "🔥", "🤡", "🦊", "🐱", "🐶", "🦄", "👽", "👾", "💖", "🤠"];

  const SUGGESTED_TASKS = [
    { title: "Matematika", label: "Integral/Kalkulus", prompt: "Pleng, hitung integral dari 3x^2 + 2x - 5 dong, pusing kepala babi gue ngerjainnya!" },
    { title: "Koding", label: "Bubble Sort JS", prompt: "Pleng, bikinin fungsi Bubble Sort di JavaScript lengkap dengan penjelasannya buat tugas kuliah dongo gue!" },
    { title: "Sejarah", label: "Kemerdekaan RI", prompt: "Pleng, jelasin sejarah singkat kemerdekaan Indonesia 17 Agustus 1945 pake bahasa gaul toxic lu biar ga bosen!" },
    { title: "Sastra", label: "Puisi Galau", prompt: "Pleng, bikinin puisi galau tentang putus cinta tapi isinya sarkas dan toxic penuh sindiran!" }
  ];

  // Fluctuating viewer count (simulated comments from others removed)
  useEffect(() => {
    const viewerInterval = setInterval(() => {
      setViewerCount((prev) => prev + Math.floor(Math.random() * 31) - 15);
    }, 4000);

    return () => {
      clearInterval(viewerInterval);
    };
  }, []);

  // Auto scroll feeds
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [simulatedComments]);

  // Audio Playback of Gemini TTS voice via Server-side Endpoint
  const speakResponse = async (text: string) => {
    if (!isTtsEnabled) return;

    // Cancel any current SpeechSynthesis if active
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Stop current custom audio if playing
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch (e) {}
    }

    try {
      setIsAudioPlaying(true);
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceName: "Puck" }),
      });

      const data = await response.json();
      if (data.audio) {
        // Play base64 audio
        const binary = atob(data.audio);
        const arrayBuffer = new ArrayBuffer(binary.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < binary.length; i++) {
          view[i] = binary.charCodeAt(i);
        }

        // Initialize AudioContext lazily
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;

        ctx.decodeAudioData(
          arrayBuffer,
          (buffer) => {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            currentAudioSourceRef.current = source;
            source.onended = () => {
              setIsAudioPlaying(false);
              // In voice-only hands-free mode, trigger next listening cycle
              if (isVoiceOnlyMode && isRecording) {
                restartContinuousListening();
              }
            };
            source.start(0);
          },
          (err) => {
            console.error("Audio decoding error:", err);
            fallbackSpeechSynthesis(text);
          }
        );
      } else {
        fallbackSpeechSynthesis(text);
      }
    } catch (e) {
      console.error("Gemini TTS API request failed:", e);
      fallbackSpeechSynthesis(text);
    }
  };

  // Fallback robotic TTS if Gemini API fails
  const fallbackSpeechSynthesis = (text: string) => {
    if (!window.speechSynthesis) {
      setIsAudioPlaying(false);
      return;
    }
    const cleanText = text.replace(/[*_`#\-]/g, "").replace(/\n+/g, " ").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "id-ID";
    utterance.pitch = 1.35;
    utterance.rate = 1.05;
    utterance.onstart = () => setIsAudioPlaying(true);
    utterance.onend = () => {
      setIsAudioPlaying(false);
      if (isVoiceOnlyMode && isRecording) {
        restartContinuousListening();
      }
    };
    window.speechSynthesis.speak(utterance);
  };

  // Trigger TTS whenever response changes
  useEffect(() => {
    if (currentResponse?.reply && userJoined) {
      speakResponse(currentResponse.reply);
    }
  }, [currentResponse, userJoined]);

  // Setup Browser Speech Recognition (Hands-Free / Continuous)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "id-ID";

      rec.onstart = () => {
        setIsRecording(true);
        setSpeechTranscript("");
      };

      rec.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const finalTranscript = event.results[i][0].transcript;
            if (finalTranscript.trim()) {
              setSpeechTranscript("");
              handleSendMessage(finalTranscript);
              // Stop recognition during AI processing and speech to prevent self-listening
              rec.stop();
            }
          } else {
            interim += event.results[i][0].transcript;
            setSpeechTranscript(interim);
          }
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        // Do not crash, keep state
      };

      rec.onend = () => {
        setIsRecording(false);
        // If voice only mode is active and we are not playing audio, auto restart!
        if (isVoiceOnlyMode && !isAudioPlaying && userJoined) {
          setTimeout(() => {
            try {
              rec.start();
            } catch (err) {}
          }, 1000);
        }
      };

      recognitionRef.current = rec;
    }
  }, [isVoiceOnlyMode, isAudioPlaying, userJoined]);

  // Restart speech listening cycle
  const restartContinuousListening = () => {
    if (recognitionRef.current && isVoiceOnlyMode) {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current.start();
        }, 800);
      } catch (err) {}
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Browser lu kaga support Speech Recognition peler! Pake Chrome/Edge/Safari napa.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Switch to full voice mode ("Bicara Langsung" full layout change)
  const enterVoiceOnlyMode = () => {
    setIsVoiceOnlyMode(true);
    // Auto trigger microphone listening on entry
    setTimeout(() => {
      if (recognitionRef.current && !isRecording) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    }, 200);
  };

  const exitVoiceOnlyMode = () => {
    setIsVoiceOnlyMode(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  // Handle send chat message
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isThinking) return;

    const activeUserMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      username: userNickname || "Bocil_Dongo_99",
      avatar: userAvatar,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, activeUserMsg]);
    setInputMessage("");
    setIsThinking(true);
    setLikesCount((prev) => prev + Math.floor(Math.random() * 150) + 50);

    // Spurt beautiful floating hearts
    triggerHearts(3);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages
            .filter((m) => m.sender !== "system")
            .map((m) => ({
              role: m.sender === "user" ? "user" : "model",
              text: m.text,
            }))
            .slice(-6),
        }),
      });

      const data = await response.json();
      if (data.reply) {
        setCurrentResponse({ reply: data.reply, mood: data.mood });

        const newAiMsg: Message = {
          id: Math.random().toString(),
          sender: "lumina",
          username: "LuminaPleng 🐗",
          avatar: "🐗",
          text: data.reply,
          mood: data.mood,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, newAiMsg]);
      }
    } catch (err) {
      console.error(err);
      const backupErr: Message = {
        id: "err-" + Math.random(),
        sender: "lumina",
        username: "LuminaPleng 🐗",
        avatar: "🐗",
        text: "Duh anying, server babi lagi teler berat! Coba nanya lagi ntar peler!",
        mood: "plenger",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, backupErr]);
      setCurrentResponse({
        reply: "Duh anying, server babi lagi teler berat! Coba nanya lagi ntar peler!",
        mood: "plenger",
      });
    } finally {
      setIsThinking(false);
    }
  };

  // Handle Gift shortcuts
  const sendGift = async (giftType: string, giftName: string, icon: string) => {
    if (isThinking) return;

    setGiftOverlay({
      type: giftType,
      text: `Mengirim ${giftName} ${icon}...`,
      active: true,
    });

    setLikesCount((prev) => prev + 5000);
    triggerHearts(12);

    const giftMsg: Message = {
      id: Math.random().toString(),
      sender: "system",
      username: "SYSTEM",
      avatar: "🎁",
      text: `${userNickname || "Bocil_Dongo_99"} mengirim gift ${giftName.toUpperCase()} ${icon}!`,
      isGift: true,
      giftType: giftType,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, giftMsg]);

    setTimeout(() => {
      setGiftOverlay(null);
    }, 2500);

    setIsThinking(true);

    try {
      const response = await fetch("/api/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftType }),
      });
      const data = await response.json();

      if (data.reply) {
        setCurrentResponse({ reply: data.reply, mood: data.mood });
        const newAiMsg: Message = {
          id: Math.random().toString(),
          sender: "lumina",
          username: "LuminaPleng 🐗",
          avatar: "🐗",
          text: data.reply,
          mood: data.mood,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, newAiMsg]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsThinking(false);
    }
  };

  // Optimized floating hearts generator to prevent any lag
  const triggerHearts = (count = 4) => {
    const colors = ["#FF007A", "#FF5CAB", "#FF80BF", "#7000FF", "#E60067", "#3B82F6", "#F59E0B", "#10B981"];
    const emojis = ["❤️", "💖", "🔥", "🐖", "🐗", "✨", "💕", "😍", "🎉"];
    
    setHearts((prev) => {
      // Bound heart pool to max 25 elements to completely prevent layout/render lag
      const filtered = prev.length > 25 ? prev.slice(-15) : prev;
      
      const newHearts = [];
      for (let i = 0; i < count; i++) {
        const id = heartIdCounter.current++;
        newHearts.push({
          id,
          scale: 0.5 + Math.random() * 0.8,
          left: 20 + Math.random() * 60, // random offset across right side
          duration: 1.5 + Math.random() * 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
        });
      }
      return [...filtered, ...newHearts];
    });
  };

  // Clear single heart animation once finished
  const removeHeart = (id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  };

  // Enter stream gate action
  const handleEnterStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNickname.trim()) {
      alert("Masukkan nama panggung/nickname dongo lu peler!");
      return;
    }
    setUserJoined(true);
    
    // Push joining message to stream feed
    const joinMsg: Message = {
      id: "joined-" + Math.random(),
      sender: "system",
      username: "SYSTEM",
      avatar: "👋",
      text: `👋 ${userNickname} baru bergabung ke live stream LuminaPleng!`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, joinMsg]);
  };

  // Dynamic 3D interactive movements for Framer Motion boar based on mood or voice
  const getBoarMotionProps = (mood: string, isSpeaking: boolean) => {
    if (isSpeaking) {
      return {
        animate: {
          y: [-8, 8, -8],
          scale: [1, 1.06, 1],
          rotate: [-1.5, 1.5, -1.5],
        },
        transition: {
          duration: 0.25,
          repeat: Infinity,
          ease: "easeInOut",
        },
      };
    }

    switch (mood) {
      case "ngamuk":
        return {
          animate: {
            x: [-6, 6, -6, 6, 0],
            y: [-3, 3, -3, 3, 0],
            scale: [1, 1.15, 0.95, 1.1, 1],
            rotate: [-4, 4, -4, 4, 0],
          },
          transition: {
            duration: 0.3,
            repeat: Infinity,
            ease: "linear",
          },
        };
      case "plenger":
        return {
          animate: {
            rotate: [0, 15, -15, 0],
            scale: [1, 0.95, 1.05, 1],
            y: [-12, 12, -12],
          },
          transition: {
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
      case "capek":
        return {
          animate: {
            y: [0, 8, 0],
            scaleY: [1, 0.93, 1],
            scaleX: [1, 1.05, 1],
          },
          transition: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
      case "pinter":
        return {
          animate: {
            y: [-16, 0, -16],
            scale: [1.02, 0.98, 1.02],
          },
          transition: {
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
      case "gembira":
        return {
          animate: {
            y: [0, -30, 0],
            scaleY: [1.05, 0.85, 1.1, 1],
            scaleX: [0.95, 1.1, 0.9, 1],
          },
          transition: {
            duration: 0.65,
            repeat: Infinity,
            repeatDelay: 0.2,
            ease: "easeOut",
          },
        };
      case "sarkas":
      default:
        return {
          animate: {
            rotate: [-4, 4, -4],
            x: [-8, 8, -8],
            y: [-4, 4, -4],
          },
          transition: {
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
          },
        };
    }
  };

  const getMoodConfig = (mood: string) => {
    switch (mood) {
      case "ngamuk":
        return {
          text: "👿 Ngamuk",
          color: "bg-red-500/25 border-red-500 text-red-300",
          expressionColor: "#ff3333",
          earAngle: 15,
          mouthOpen: 30,
        };
      case "plenger":
        return {
          text: "🤪 Plenger/Teler",
          color: "bg-purple-500/25 border-purple-500 text-purple-300",
          expressionColor: "#bf55ec",
          earAngle: -10,
          mouthOpen: 22,
        };
      case "capek":
        return {
          text: "😴 Mager/Sore Capek",
          color: "bg-amber-500/25 border-amber-500 text-amber-300",
          expressionColor: "#e67e22",
          earAngle: -18,
          mouthOpen: 6,
        };
      case "pinter":
        return {
          text: "🎓 Jenius Sombong",
          color: "bg-teal-500/25 border-teal-500 text-teal-300",
          expressionColor: "#2ecc71",
          earAngle: 5,
          mouthOpen: 14,
        };
      case "gembira":
        return {
          text: "💖 Happy Gembira",
          color: "bg-pink-500/25 border-pink-500 text-pink-300",
          expressionColor: "#ff66b2",
          earAngle: 25,
          mouthOpen: 28,
        };
      case "sarkas":
      default:
        return {
          text: "😏 SARKAS & TOXIC",
          color: "bg-blue-500/25 border-blue-500 text-blue-300",
          expressionColor: "#3498db",
          earAngle: 0,
          mouthOpen: 12,
        };
    }
  };

  const activeMood = currentResponse?.mood || "sarkas";
  const moodStyle = getMoodConfig(activeMood);

  // Copy text helper
  const copyToClipboard = () => {
    if (!currentResponse?.reply) return;
    navigator.clipboard.writeText(currentResponse.reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-[#0F0510] text-white flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden relative selection:bg-[#FF007A] selection:text-white font-sans select-none">
      
      {/* Decorative ambient neon background mesh glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FF007A] opacity-20 blur-[130px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#7000FF] opacity-20 blur-[130px] rounded-full"></div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* ==================== 1. SETUP / GATE LOBBY SCREEN ==================== */}
        {!userJoined ? (
          <motion.div
            key="lobby-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-[480px] bg-[#1A0B1D]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 flex flex-col gap-6"
          >
            {/* Logo and Greeting */}
            <div className="text-center flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF007A] to-[#7000FF] p-1 shadow-lg animate-pulse">
                <div className="w-full h-full bg-[#1A0B1D] rounded-[14px] flex items-center justify-center text-3xl">🐗</div>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight mt-1 bg-gradient-to-r from-[#FF007A] to-pink-300 bg-clip-text text-transparent">
                LOBBY LIVE LUMINA
              </h2>
              <p className="text-xs text-zinc-400">
                Atur nama panggung & foto profil lu sebelum masuk kandang babi hutan pink paling toxic se-Indonesia!
              </p>
            </div>

            <form onSubmit={handleEnterStream} className="flex flex-col gap-5">
              {/* Nickname Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#FF007A] uppercase tracking-wider font-mono">
                  Nickname Panggung (Wajib)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bocil_Dongo_99 atau Lord_Kipli"
                  maxLength={15}
                  required
                  value={userNickname}
                  onChange={(e) => setUserNickname(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-sm focus:outline-none focus:border-[#FF007A] transition-all placeholder-zinc-500"
                />
              </div>

              {/* Avatar Preset Selector */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#FF007A] uppercase tracking-wider font-mono">
                    Pilih Karakter Profil (Avatar)
                  </label>
                  <span className="text-[10px] text-zinc-500 italic">Klik preset emoji di bawah</span>
                </div>
                <div className="grid grid-cols-6 gap-2 bg-black/40 p-3 rounded-2xl border border-white/5">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setUserAvatar(preset)}
                      className={`h-11 rounded-xl text-xl flex items-center justify-center transition-all ${
                        userAvatar === preset
                          ? "bg-[#FF007A] text-white scale-110 shadow-lg shadow-[#FF007A]/30 border border-white/20"
                          : "bg-white/5 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enter Button */}
              <button
                type="submit"
                className="w-full bg-[#FF007A] hover:bg-[#D10064] text-white font-bold py-4 rounded-2xl text-sm transition-all uppercase tracking-widest shadow-xl shadow-[#FF007A]/20 active:scale-95 flex items-center justify-center gap-2 mt-2"
              >
                <span>Masuk Kandang LiveStream</span> 🐗
              </button>
            </form>

            {/* Note */}
            <div className="text-[10px] text-center text-zinc-500 font-mono">
              Host: LuminaPleng • Powered by Gemini-3.5-Flash & @google/genai
            </div>
          </motion.div>
        ) : (
          
          // ==================== 2. MAIN IMMERSIVE LIVE VIEW SCREEN ====================
          <motion.div
            key="live-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-[1024px] h-[92vh] sm:h-[768px] bg-black border border-white/10 rounded-3xl overflow-hidden relative flex flex-col shadow-2xl z-10"
          >
            {/* FULL-SCREEN REALIST BACKGROUND IMAGE (Pixar Playground Render) */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none">
              <img
                src={playgroundBg}
                alt="Children Park Playground Background"
                className="w-full h-full object-cover opacity-90 transition-all filter brightness-[0.7] saturate-[1.1] scale-105"
              />
              {/* Blur vignette overlay to merge colors perfectly with the ambient purple-black frame */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F0510] via-transparent to-black/70"></div>
              
              {/* Interactive Pool Glow */}
              <div className="absolute bottom-[10%] left-[25%] w-[120px] h-[40px] bg-cyan-400 opacity-20 blur-[20px] rounded-full animate-pulse"></div>
            </div>

            {/* Ambient Floating Sparks in Playground */}
            <div className="absolute top-1/4 right-10 w-2.5 h-2.5 bg-[#FF007A] rounded-full blur-[2px] opacity-40 animate-bounce pointer-events-none"></div>
            <div className="absolute bottom-1/3 left-1/4 w-3.5 h-3.5 bg-blue-500 rounded-full blur-[3px] opacity-20 animate-pulse pointer-events-none"></div>
            <div className="absolute top-1/3 left-10 w-2 h-2 bg-yellow-400 rounded-full blur-[1px] opacity-30 animate-pulse pointer-events-none"></div>

            {/* ==================== UPPER PILL ROUNDED HEADER BAR ==================== */}
            <header className="absolute top-4 inset-x-2 sm:inset-x-6 z-20 flex justify-center items-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-full border border-white/10 flex items-center gap-2 sm:gap-4 shadow-2xl pointer-events-auto text-[10px] sm:text-xs">
                {/* Host Profile */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 border-r border-white/10 pr-2 sm:pr-4">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 border-[#FF007A] p-0.5 overflow-hidden bg-slate-950 shadow-md">
                    <img
                      src={avatarImg}
                      alt="LuminaPleng"
                      className="w-full h-full object-cover rounded-full"
                      onError={(e: any) => {
                        e.target.src = "https://picsum.photos/seed/babi/400/400";
                      }}
                    />
                  </div>
                  <div>
                    <h1 className="text-[10px] sm:text-xs font-extrabold tracking-tight text-white leading-none">LuminaPleng 🐗</h1>
                    <p className="text-[8px] sm:text-[9px] text-[#FF007A] font-bold flex items-center gap-0.5 sm:gap-1 mt-0.5 leading-none">
                      <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-[#FF007A] rounded-full animate-ping"></span> LIVE
                    </p>
                  </div>
                </div>

                {/* Like Count */}
                <div className="flex items-center gap-1 font-mono text-[10px] sm:text-xs font-bold text-pink-300">
                  <Heart size={12} className="text-[#FF007A] fill-[#FF007A]" />
                  <span>{likesCount.toLocaleString()} <span className="hidden sm:inline">Likes</span></span>
                </div>

                {/* Live Spectators Count */}
                <div className="flex items-center gap-1 bg-[#FF007A]/20 border border-[#FF007A]/30 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-mono text-white">
                  <Users size={10} className="text-[#FF007A]" />
                  <span>{viewerCount.toLocaleString()} <span className="hidden sm:inline">Penonton</span></span>
                </div>

                {/* Logout / Back to Lobby Button */}
                <button
                  onClick={() => setUserJoined(false)}
                  className="p-1 sm:p-1.5 bg-white/5 hover:bg-red-500/20 border border-white/5 rounded-full hover:border-red-500/30 transition-all"
                  title="Keluar / Reset Lobby"
                >
                  <LogOut size={11} className="text-zinc-400 hover:text-red-400" />
                </button>
              </div>
            </header>

            {/* FULL SCREEN GIFT OVERLAY (Visual effect) */}
            <AnimatePresence>
              {giftOverlay?.active && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md pointer-events-none"
                >
                  <motion.div
                    initial={{ scale: 0.3, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0.3, rotate: 15 }}
                    transition={{ type: "spring", damping: 10 }}
                    className="flex flex-col items-center"
                  >
                    {giftOverlay.type === "mawar" && <div className="text-8xl filter drop-shadow-[0_0_20px_#FF007A]">🌹</div>}
                    {giftOverlay.type === "kopi" && <div className="text-8xl filter drop-shadow-[0_0_20px_#E67E22]">☕🔥</div>}
                    {giftOverlay.type === "pecel_lele" && <div className="text-8xl filter drop-shadow-[0_0_20px_#2ECC71]">🌶️🐟🍚</div>}
                    {giftOverlay.type === "cendol" && <div className="text-8xl filter drop-shadow-[0_0_20px_#10B981]">🥤🥥</div>}
                    {giftOverlay.type === "paus" && (
                      <div className="flex flex-col items-center animate-bounce">
                        <div className="text-[100px] filter drop-shadow-[0_0_40px_#7000FF]">🐋🌊</div>
                        <span className="text-[#7000FF] font-mono text-xs tracking-widest font-extrabold bg-[#7000FF]/20 px-4 py-1.5 rounded-full border border-[#7000FF] mt-2 shadow-2xl">
                          ROYAL PAUS DIRAJA
                        </span>
                      </div>
                    )}
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-wide text-white mt-4 drop-shadow-[0_2px_8px_rgba(255,0,122,0.6)] bg-black/40 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md">
                      {giftOverlay.text}
                    </span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ==================== MAIN CENTER AREA (Karakter 3D & Playground) ==================== */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 p-4">
              
              {/* CHARACTER CONTAINER */}
              <div className="relative w-full max-w-[420px] flex flex-col items-center justify-center -mt-4 sm:-mt-8">
                
                {/* 3D VECTOR BOAR CHARACTER (LUMINA) */}
                <motion.div
                  {...getBoarMotionProps(activeMood, isAudioPlaying)}
                  className="w-[180px] h-[180px] sm:w-[280px] sm:h-[280px] relative flex items-center justify-center cursor-pointer select-none filter drop-shadow-[0_25px_45px_rgba(255,0,122,0.35)]"
                  title="Si Lumina Plenger"
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <defs>
                      {/* Body Gradient - Radial 3D shading */}
                      <radialGradient id="body3d" cx="45%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#FFA6D3" />
                        <stop offset="65%" stopColor="#FF007A" />
                        <stop offset="100%" stopColor="#9C0044" />
                      </radialGradient>
                      
                      {/* Head Gradient - 3D spherical look */}
                      <radialGradient id="head3d" cx="45%" cy="30%" r="60%">
                        <stop offset="0%" stopColor="#FFCBE5" />
                        <stop offset="60%" stopColor="#FF3399" />
                        <stop offset="100%" stopColor="#BF0055" />
                      </radialGradient>

                      {/* Snout Gradient */}
                      <radialGradient id="snout3d" cx="40%" cy="35%" r="60%">
                        <stop offset="0%" stopColor="#FF7DC0" />
                        <stop offset="75%" stopColor="#D8006E" />
                        <stop offset="100%" stopColor="#6E0038" />
                      </radialGradient>

                      {/* Ears Gradients */}
                      <linearGradient id="earLeft" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#D8006E" />
                        <stop offset="100%" stopColor="#FFA6D3" />
                      </linearGradient>
                      <linearGradient id="earRight" x1="100%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#D8006E" />
                        <stop offset="100%" stopColor="#FFA6D3" />
                      </linearGradient>

                      {/* Sparkles / Glowing Eyes */}
                      <filter id="eyeGlow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Ears with interactive rotatable dynamic angles based on mood */}
                    {/* Left Ear */}
                    <g transform={`rotate(${-moodStyle.earAngle}, 55, 75)`}>
                      <path d="M50 70 Q25 35 60 55 Z" fill="url(#earLeft)" stroke="#9C0044" strokeWidth="1.5" />
                      <path d="M48 68 Q32 45 55 58 Z" fill="#9C0044" opacity="0.5" />
                    </g>
                    {/* Right Ear */}
                    <g transform={`rotate(${moodStyle.earAngle}, 145, 75)`}>
                      <path d="M150 70 Q175 35 140 55 Z" fill="url(#earRight)" stroke="#9C0044" strokeWidth="1.5" />
                      <path d="M152 68 Q168 45 145 58 Z" fill="#9C0044" opacity="0.5" />
                    </g>

                    {/* Outer Body / Main Spherical form with 3D shadow */}
                    <circle cx="100" cy="115" r="72" fill="black" opacity="0.15" transform="translate(0, 10)" />
                    <circle cx="100" cy="115" r="70" fill="url(#body3d)" stroke="#80003C" strokeWidth="2" />

                    {/* Cheek Blush (3D highlight texture) */}
                    <circle cx="56" cy="132" r="11" fill="#FF007A" opacity="0.35" filter="blur(1.5px)" />
                    <circle cx="144" cy="132" r="11" fill="#FF007A" opacity="0.35" filter="blur(1.5px)" />

                    {/* Teler / Sparkle Eyes based on active mood */}
                    {/* Left Eye */}
                    <g transform="translate(0,0)">
                      <circle cx="70" cy="106" r="10" fill="white" stroke="#6E0038" strokeWidth="1" />
                      {activeMood === "ngamuk" ? (
                        <>
                          <path d="M58 96 L82 104" stroke="#ff3333" strokeWidth="3" strokeLinecap="round" />
                          <circle cx="72" cy="108" r="4.5" fill="#ff3333" filter="url(#eyeGlow)" />
                          <circle cx="72" cy="108" r="2" fill="white" />
                        </>
                      ) : activeMood === "plenger" ? (
                        <>
                          {/* Spiral Eye for teler state */}
                          <path d="M66 106 Q70 100 74 106 Q70 112 66 106" stroke="#555" strokeWidth="1.5" fill="none" />
                          <circle cx="70" cy="106" r="1.5" fill="black" />
                        </>
                      ) : activeMood === "capek" ? (
                        <>
                          {/* Semicircle lazy eyelids */}
                          <path d="M58 106 L82 106 Z" fill="#FF3399" />
                          <line x1="58" y1="106" x2="82" y2="106" stroke="black" strokeWidth="2" />
                          <circle cx="70" cy="110" r="3" fill="black" />
                        </>
                      ) : activeMood === "pinter" ? (
                        <>
                          {/* Star sparkles eyes */}
                          <polygon points="70,100 72,104 76,106 72,108 70,112 68,108 64,106 68,104" fill="#2ecc71" filter="url(#eyeGlow)" />
                          <circle cx="70" cy="106" r="2" fill="white" />
                        </>
                      ) : activeMood === "gembira" ? (
                        <>
                          {/* Arch happy eyes */}
                          <path d="M62 108 Q70 98 78 108" stroke="#333" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                        </>
                      ) : (
                        <>
                          {/* Normal sassy eyes looking sideways */}
                          <circle cx="72" cy="106" r="5" fill="#333" />
                          <circle cx="74" cy="104" r="2.2" fill="white" />
                        </>
                      )}
                    </g>

                    {/* Right Eye */}
                    <g transform="translate(0,0)">
                      <circle cx="130" cy="106" r="10" fill="white" stroke="#6E0038" strokeWidth="1" />
                      {activeMood === "ngamuk" ? (
                        <>
                          <path d="M142 96 L118 104" stroke="#ff3333" strokeWidth="3" strokeLinecap="round" />
                          <circle cx="128" cy="108" r="4.5" fill="#ff3333" filter="url(#eyeGlow)" />
                          <circle cx="128" cy="108" r="2" fill="white" />
                        </>
                      ) : activeMood === "plenger" ? (
                        <>
                          <path d="M126 106 Q130 100 134 106 Q130 112 126 106" stroke="#555" strokeWidth="1.5" fill="none" />
                          <circle cx="130" cy="106" r="1.5" fill="black" />
                        </>
                      ) : activeMood === "capek" ? (
                        <>
                          <path d="M118 106 L142 106 Z" fill="#FF3399" />
                          <line x1="118" y1="106" x2="142" y2="106" stroke="black" strokeWidth="2" />
                          <circle cx="130" cy="110" r="3" fill="black" />
                        </>
                      ) : activeMood === "pinter" ? (
                        <>
                          <polygon points="130,100 132,104 136,106 132,108 130,112 128,108 124,106 128,104" fill="#2ecc71" filter="url(#eyeGlow)" />
                          <circle cx="130" cy="106" r="2" fill="white" />
                        </>
                      ) : activeMood === "gembira" ? (
                        <>
                          <path d="M122 108 Q130 98 138 108" stroke="#333" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                        </>
                      ) : (
                        <>
                          {/* Normal sassy eyes looking sideways */}
                          <circle cx="128" cy="106" r="5" fill="#333" />
                          <circle cx="130" cy="104" r="2.2" fill="white" />
                        </>
                      )}
                    </g>

                    {/* Cute Wild Boar Tusks */}
                    {/* Left Tusk */}
                    <path d="M72 136 Q54 150 78 144 Z" fill="white" stroke="#6E0038" strokeWidth="1" />
                    {/* Right Tusk */}
                    <path d="M128 136 Q146 150 122 144 Z" fill="white" stroke="#6E0038" strokeWidth="1" />

                    {/* Snout with 3D Shading */}
                    <ellipse cx="100" cy="134" rx="26" ry="18" fill="url(#snout3d)" stroke="#6E0038" strokeWidth="1.5" />
                    
                    {/* Nostrils (Breathing holes) */}
                    <circle cx="92" cy="134" r="3.5" fill="#40001D" />
                    <circle cx="108" cy="134" r="3.5" fill="#40001D" />

                    {/* Interactive Animated Snout Mouth (Opens & Closes during active speech) */}
                    <g transform={`translate(100, 146)`}>
                      <motion.ellipse
                        cx="0"
                        cy="0"
                        rx="12"
                        animate={isAudioPlaying ? { ry: [1, moodStyle.mouthOpen / 2, 1] } : { ry: [1.5] }}
                        transition={isAudioPlaying ? { duration: 0.2, repeat: Infinity } : {}}
                        fill="#590026"
                      />
                    </g>

                    {/* Snout blush / cute snout bridge highlight */}
                    <ellipse cx="100" cy="126" rx="14" ry="4" fill="white" opacity="0.25" />
                  </svg>

                  {/* Tiny Cute Little Floating Crown or Glasses when Pinter */}
                  {activeMood === "pinter" && (
                    <div className="absolute top-8 text-3xl filter drop-shadow-md animate-bounce">🎓</div>
                  )}
                  {activeMood === "ngamuk" && (
                    <div className="absolute top-6 text-3xl filter drop-shadow-[0_0_10px_red] animate-pulse">⚡🔥</div>
                  )}
                  {activeMood === "gembira" && (
                    <div className="absolute top-6 text-2xl animate-spin-slow">✨🍬</div>
                  )}
                </motion.div>

                {/* STATUS BADGE BELOW BOAR */}
                <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-mono tracking-widest uppercase border border-white/15 text-[#FF007A] font-bold shadow-lg mt-2">
                  {isAudioPlaying ? "🔊 SEDANG NGOMONG..." : `Sedang ${activeMood}...`}
                </div>
              </div>

              {/* FLOATING RESPONSE BUBBLE (STABIL DI TENGAH LAYAR) */}
              <AnimatePresence mode="wait">
                {currentResponse?.reply && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-[500px] bg-[#1A0B1D]/85 border border-white/10 rounded-2xl p-3.5 sm:p-5 shadow-2xl relative mt-2 sm:mt-4 backdrop-blur-xl mx-auto"
                  >
                    {/* Badge */}
                    <div className="absolute -top-3 left-6 bg-[#FF007A] text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-white shadow-md">
                      LuminaPleng Berkata:
                    </div>

                    <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-white/5 text-xs">
                      <span className="font-mono text-zinc-400 font-bold text-[9px] tracking-widest uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        REAKSI LIVE
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] border font-extrabold tracking-wider uppercase ${moodStyle.color}`}>
                        {moodStyle.text}
                      </span>
                    </div>

                    <p className="text-sm font-semibold leading-relaxed text-zinc-100 font-mono text-center select-text">
                      &ldquo;{currentResponse.reply}&rdquo;
                    </p>

                    {/* Response utilities */}
                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-white/5 text-xs text-zinc-400">
                      <span className="text-[9px] text-zinc-500 italic font-mono">
                        {isAudioPlaying ? "🔊 Suara Berjalan..." : "🔇 Sunyi"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => speakResponse(currentResponse.reply)}
                          className="p-1 hover:text-[#FF007A] hover:bg-white/5 rounded transition-all"
                          title="Putar Ulang Suara Babi"
                        >
                          <Volume2 size={15} />
                        </button>
                        <button
                          onClick={copyToClipboard}
                          className="flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 rounded-lg hover:border-[#FF007A]/50 hover:text-white transition-all text-[9px] font-bold uppercase tracking-wider"
                          title="Copy Tanggapan"
                        >
                          {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                          <span>{copied ? "Tersalin" : "Salin"}</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* ==================== FLOATING INTERACTION OVERLAYS ==================== */}

            {/* A. FLOATING HEART DISPLAY - ALIGNED AT THE RIGHT MARGIN */}
            <div className="absolute right-6 top-[20%] bottom-[20%] w-[100px] z-20 pointer-events-none overflow-hidden select-none">
              <AnimatePresence>
                {hearts.map((heart) => (
                  <motion.div
                    key={heart.id}
                    initial={{ opacity: 1, y: 500, scale: 0.1, x: 0 }}
                    animate={{
                      opacity: [1, 1, 0],
                      y: 0,
                      scale: [heart.scale * 0.5, heart.scale, heart.scale * 0.7],
                      x: [0, Math.sin(heart.id) * 20, Math.cos(heart.id) * 30, Math.sin(heart.id) * 15],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: heart.duration, ease: "easeOut" }}
                    onAnimationComplete={() => removeHeart(heart.id)}
                    className="absolute bottom-0 text-2xl filter drop-shadow-[0_2px_10px_rgba(255,0,122,0.6)]"
                    style={{ left: `${heart.left}%` }}
                  >
                    {heart.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* B. TIKTOK-STYLE FLOATING COMMENT FEED - ALIGNED AT LEFT SIDE */}
            <div className="absolute bottom-24 left-3 sm:left-6 w-[240px] sm:w-[280px] h-[150px] sm:h-[220px] z-20 pointer-events-none flex flex-col justify-end">
              <div className="overflow-y-auto max-h-full chat-scroll pr-1 flex flex-col gap-1.5 pointer-events-auto">
                <AnimatePresence>
                  {/* USER'S ACTUAL CHATS & SYSTEM LOGS DISPLAY IN FEED */}
                  {messages
                    .filter((m) => m.sender === "user" || (m.sender === "system" && m.id !== "welcome"))
                    .slice(-15)
                    .map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`p-2 rounded-xl backdrop-blur-md flex items-start gap-2 max-w-[95%] shadow-md ${
                          m.sender === "system"
                            ? "bg-purple-900/20 border border-purple-500/30 shadow-purple-500/5"
                            : "bg-[#FF007A]/10 border border-[#FF007A]/30 shadow-[#FF007A]/5"
                        }`}
                      >
                        <span className="text-base select-none">{m.avatar}</span>
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] text-pink-300 font-black leading-none flex items-center gap-1">
                            @{m.username}{" "}
                            {m.sender === "user" && (
                              <span className="text-[7px] bg-[#FF007A] text-white font-extrabold px-1 rounded uppercase">Kamu</span>
                            )}
                          </span>
                          <p className="text-[11px] text-white leading-tight mt-1 font-bold">{m.text}</p>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={commentEndRef} />
              </div>
            </div>

            {/* C. BOTTOM DRAWER: FLOATING SHORTCUT PRESENTS */}
            <div className="absolute bottom-16 sm:bottom-20 inset-x-3 sm:inset-x-6 z-20 flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between items-stretch sm:items-center pointer-events-none">
              
              {/* Preset tasks quick suggestions */}
              <div className="flex gap-1 overflow-x-auto pr-2 chat-scroll pointer-events-auto max-w-full sm:max-w-[65%]">
                {SUGGESTED_TASKS.map((task, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputMessage(task.prompt);
                      handleSendMessage(task.prompt);
                    }}
                    className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[9px] font-bold bg-black/60 backdrop-blur-md hover:bg-black/80 border border-white/5 hover:border-[#FF007A]/30 text-zinc-300 rounded-lg flex items-center gap-1 transition-all whitespace-nowrap uppercase tracking-wider"
                    title={task.prompt}
                  >
                    <Sparkle size={9} className="text-[#FF007A]" />
                    <span>{task.title}:</span>
                    <span className="text-white">{task.label}</span>
                  </button>
                ))}
              </div>

              {/* Preset Gifts shelf */}
              <div className="flex gap-1 pointer-events-auto items-center justify-end">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400 bg-black/50 px-2 py-1 rounded border border-white/5 mr-1 hidden md:inline">Gift:</span>
                <button
                  onClick={() => sendGift("mawar", "Mawar", "🌹")}
                  className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-black/60 border border-[#FF007A]/30 hover:border-[#FF007A] text-[8px] sm:text-[9px] font-black uppercase text-[#FF007A] transition-all hover:scale-105 active:scale-95"
                >
                  🌹 Mawar
                </button>
                <button
                  onClick={() => sendGift("kopi", "Kopi", "☕")}
                  className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-black/60 border border-amber-500/30 hover:border-amber-500 text-[8px] sm:text-[9px] font-black uppercase text-amber-300 transition-all hover:scale-105 active:scale-95"
                >
                  ☕ Kopi
                </button>
                <button
                  onClick={() => sendGift("paus", "Paus", "🐋")}
                  className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#FF007A] hover:bg-[#D10064] text-white border border-white/10 text-[8px] sm:text-[9px] font-black uppercase transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#FF007A]/20"
                >
                  🐋 PAUS
                </button>
              </div>
            </div>

            {/* ==================== DEEPEST BOTTOM INTERACTION BAR (Sesuai Revisi Desain) ==================== */}
            <footer className="p-4 bg-black/80 border-t border-white/10 backdrop-blur-md z-20 relative">
              <div className="w-full max-w-[800px] mx-auto flex flex-col gap-2">
                
                {/* 1. TEXT INPUT LAYOUT */}
                <AnimatePresence mode="wait">
                  {!isVoiceOnlyMode ? (
                    <motion.div
                      key="text-input-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-3 w-full"
                    >
                      {/* Message Input text field */}
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                          placeholder={
                            isThinking
                              ? "Lumina lagi mikir peler..."
                              : "Kirim pesan toxic buat LuminaPleng..."
                          }
                          disabled={isThinking}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 pr-14 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF007A] transition-all disabled:opacity-50"
                        />
                        <button
                          onClick={() => handleSendMessage()}
                          disabled={isThinking || !inputMessage.trim()}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-xl text-zinc-400 disabled:opacity-30 hover:text-[#FF007A] transition-all"
                        >
                          <Send size={18} />
                        </button>
                      </div>

                      {/* BICARA LANGSUNG (MIC) BUTTON */}
                      <button
                        onClick={enterVoiceOnlyMode}
                        className="h-12 px-5 bg-[#FF007A]/15 hover:bg-[#FF007A]/25 border border-[#FF007A]/40 hover:border-[#FF007A] rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-[#FF007A] font-extrabold text-xs uppercase tracking-wider"
                        title="Masuk Mode Hands-free Bicara Langsung"
                      >
                        <Mic size={15} />
                        <span>Bicara Langsung</span>
                      </button>

                      {/* TOMBOL SUKA (HEART LIKE BUTTON) - Tap/spam heart particles */}
                      <button
                        onClick={() => {
                          setLikesCount((prev) => prev + 1);
                          triggerHearts(4);
                        }}
                        className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/50 rounded-2xl flex items-center justify-center transition-all active:scale-90 text-[#FF007A] shadow-md shadow-black/40 group"
                        title="Kirim Love / Tap Tap Layar"
                      >
                        <Heart size={20} className="group-hover:scale-110 fill-[#FF007A] stroke-[#FF007A] transition-all" />
                      </button>
                    </motion.div>
                  ) : (
                    
                    // 2. BICARA LANGSUNG MODE ACTIVE VIEW (INPUT TEXT HILANG, HANDS-FREE CHAT LOOP)
                    <motion.div
                      key="voice-interaction-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-black/50 border border-[#FF007A]/20 p-3 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 w-full"
                    >
                      <div className="flex items-center gap-3">
                        {/* Pulse animated wave ring */}
                        <div className="relative flex items-center justify-center h-10 w-10">
                          <span className={`absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 ${isRecording && !isAudioPlaying ? "animate-ping" : ""}`}></span>
                          <div className={`relative rounded-full h-8 w-8 flex items-center justify-center ${isRecording && !isAudioPlaying ? "bg-red-500" : "bg-zinc-700"}`}>
                            {isAudioPlaying ? <Volume2 size={15} /> : <Mic size={15} />}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-red-400 tracking-wider uppercase font-mono">
                            {isAudioPlaying ? "🔇 MENYULIH SUARA GEMINI..." : "🎙️ COCOTE GACOR (HANDS-FREE ON)"}
                          </span>
                          <span className="text-[10px] text-zinc-400 italic leading-none mt-0.5">
                            {isAudioPlaying 
                              ? "Lumina lagi ngomong. Mic mati otomatis agar tidak denger suara sendiri."
                              : speechTranscript || "Ngomong langsung aja sekenceng mulut lu, ntar dideteksi otomatis..."}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Mic listen status indicator */}
                        <button
                          onClick={toggleRecording}
                          className={`px-4 h-10 rounded-xl text-xs font-bold uppercase transition-all ${
                            isRecording 
                              ? "bg-red-500/20 border border-red-500 text-red-300"
                              : "bg-zinc-800 border border-zinc-700 text-zinc-400"
                          }`}
                        >
                          {isRecording ? "Listening • ON" : "Mic • OFF"}
                        </button>

                        {/* TOMBOL SUKA (SUKA SPAM TETAP JALAN DI MODE SUARA) */}
                        <button
                          onClick={() => {
                            setLikesCount((prev) => prev + 1);
                            triggerHearts(4);
                          }}
                          className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#FF007A] active:scale-90 transition-all"
                        >
                          <Heart size={16} fill="#FF007A" stroke="#FF007A" />
                        </button>

                        {/* KEMBALI BUTTON (Kembalikan input text) */}
                        <button
                          onClick={exitVoiceOnlyMode}
                          className="px-4 h-10 bg-white text-black font-extrabold text-xs rounded-xl hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
                        >
                          <ArrowLeft size={13} />
                          <span>Kembali Ke Teks</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footnote warning text inside footer */}
                <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-mono mt-1">
                  <HelpCircle size={10} className="text-[#FF007A]" />
                  <span>Suhu live stream: <strong>LIVE COCOTE</strong> • Izin mikrofon browser wajib menyala agar bicara langsung berjalan optimal.</span>
                </div>

              </div>
            </footer>

          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
