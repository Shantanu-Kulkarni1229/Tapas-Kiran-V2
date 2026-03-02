// ============================================================
// ChatPage.jsx — Tapas Kiran (तपास किरण) Chat Interface
// Maharashtra Police SOP AI Assistant
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  listConversations,
  createConversation,
  getConversation,
  renameConversation,
  deleteConversation,
  pinConversation,
  clearAllConversations,
  sendChatMessage,
} from "../api";
import Logo from "../assets/Logo.png";
import MessageBubble from "../components/chat/MessageBubble";
import ChatComposer from "../components/chat/ChatComposer";
import {
  FiPlus,
  FiMessageSquare,
  FiTrash2,
  FiEdit2,
  FiLogOut,
  FiBookmark,
  FiMoreHorizontal,
  FiMenu,
  FiSearch,
  FiSun,
  FiMoon,
} from "react-icons/fi";
import { HiOutlineBookOpen, HiOutlineDocumentText, HiOutlineScale, HiOutlineNewspaper } from "react-icons/hi";

// ── Group conversations by date ──────────────────────────────
function groupConversations(convs) {
  const now = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const lastWeek  = new Date(today - 7 * 86400000);
  const lastMonth = new Date(today - 30 * 86400000);

  const groups = { Pinned: [], Today: [], Yesterday: [], "Previous 7 days": [], "Previous 30 days": [], Older: [] };

  for (const c of convs) {
    if (c.isPinned) { groups.Pinned.push(c); continue; }
    const d = new Date(c.updatedAt);
    if (d >= today)     groups.Today.push(c);
    else if (d >= yesterday) groups.Yesterday.push(c);
    else if (d >= lastWeek)  groups["Previous 7 days"].push(c);
    else if (d >= lastMonth) groups["Previous 30 days"].push(c);
    else                     groups.Older.push(c);
  }
  return groups;
}

// ── Quick-start prompts ──────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: <HiOutlineBookOpen className="w-5 h-5" />, label: "NDPS तपासाची SOP", prompt: "NDPS केसची तपास सुरू करताना कोणती पावले उचलावीत?" },
  { icon: <HiOutlineDocumentText className="w-5 h-5" />, label: "FIR फॉर्म", prompt: "FIR नोंदवण्यासाठी कोणता फॉर्म भरावा लागतो? IIF-1 template द्या." },
  { icon: <HiOutlineScale className="w-5 h-5" />, label: "BNS कलम पाहा", prompt: "BNS मधील कलम 103 काय आहे? IPC मधील जुन्या कलमाशी तुलना करा." },
  { icon: <HiOutlineNewspaper className="w-5 h-5" />, label: "POCSO SOP", prompt: "POCSO कायद्याखाली महिला व बाल तपास SOP सांगा." },
];

export default function ChatPage() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────
  const [conversations,      setConversations]      = useState([]);
  const [activeConvId,       setActiveConvId]       = useState(null);
  const [messages,           setMessages]           = useState([]);
  const [activeTitle,        setActiveTitle]        = useState("");
  const [input,              setInput]              = useState("");
  const [isLoading,          setIsLoading]          = useState(false);
  const [isFetchingConvs,    setIsFetchingConvs]    = useState(true);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [sidebarOpen,        setSidebarOpen]        = useState(true);
  const [renamingId,         setRenamingId]         = useState(null);
  const [renameValue,        setRenameValue]        = useState("");
  const [menuOpenId,         setMenuOpenId]         = useState(null);
  const [searchQuery,        setSearchQuery]        = useState("");
  const [user,               setUser]               = useState(null);
  const [theme,              setTheme]              = useState(() => localStorage.getItem("tk-theme") || "light");
  const [isRecording,        setIsRecording]        = useState(false);
  const [attachedFile,       setAttachedFile]       = useState(null);
  const [fileError,          setFileError]          = useState("");

  const messagesEndRef  = useRef(null);
  const inputRef        = useRef(null);
  const renameInputRef  = useRef(null);
  const recognitionRef  = useRef(null);

  // ── Load user info from localStorage ──────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // ── Apply theme to document root for global dark styles ──
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("tk-theme", theme);
  }, [theme]);

  // ── Load conversation list ─────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setIsFetchingConvs(true);
    try {
      const res = await listConversations(1, 50);
      setConversations(res.data.conversations || []);
    } catch (err) {
      if (err.response?.status === 401) navigate("/login");
    } finally {
      setIsFetchingConvs(false);
    }
  }, [navigate]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ── Open a conversation ────────────────────────────────────
  const openConversation = async (id) => {
    if (id === activeConvId) return;
    setActiveConvId(id);
    setMessages([]);
    setIsFetchingMessages(true);
    setMenuOpenId(null);
    try {
      const res = await getConversation(id);
      setMessages(res.data.messages || []);
      setActiveTitle(res.data.conversation.title);
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setIsFetchingMessages(false);
    }
  };

  // ── New chat ─────────────────────────────────────────────
  const newChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setActiveTitle("");
    setAttachedFile(null);
    setFileError("");
    inputRef.current?.focus();
  };

  // ── Voice input (browser speech recognition) ─────────────
  const startVoiceInput = () => {
    if (isRecording) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "mr-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
    };
    recognition.onerror = () => {
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  };

  const stopVoiceInput = () => {
    if (!isRecording) return;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
  };

  // ── Document attachment handling ─────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setAttachedFile(null);
      setFileError("");
      return;
    }
    setAttachedFile(file);
    setFileError("");
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setFileError("");
  };

  const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || "");
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });

  // ── Send message ───────────────────────────────────────────
  const sendMessage = async (queryOverride) => {
    if (isLoading) return;

    let baseText = (queryOverride ?? input).trim();

    const includeAttachment = !queryOverride && attachedFile;
    let finalQuery = baseText;
    let displayText = baseText;

    if (includeAttachment && attachedFile) {
      const isTextLike =
        attachedFile.type.startsWith("text/") ||
        attachedFile.name.toLowerCase().endsWith(".md");

      if (!isTextLike) {
        setFileError("Only plain text and markdown files can be queried from chat right now.");
        return;
      }

      try {
        const fileText = await readFileAsText(attachedFile);
        const safeText = String(fileText).slice(0, 50000);
        const docPrompt =
          baseText ||
          "कृपया जोडलेल्या दस्तावेजाचे विश्लेषण करून महत्त्वाचे मुद्दे, कलमे आणि SOP पावले समजावून सांगा.";

        finalQuery = `${docPrompt}\n\n[ATTACHED_DOCUMENT name="${attachedFile.name}"]\n${safeText}\n[/ATTACHED_DOCUMENT]`;
        displayText = baseText || `📎 ${attachedFile.name}`;
      } catch (err) {
        console.error("File read error:", err);
        setFileError("Unable to read the selected file.");
        return;
      }
    }

    finalQuery = (finalQuery || "").trim();
    if (!finalQuery) return;

    setInput("");
    if (!queryOverride) {
      clearAttachment();
    }
    setIsLoading(true);

    // Optimistic user message
    const userMsg = {
      _id: `u_${Date.now()}`,
      role: "user",
      content: displayText || finalQuery,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Placeholder AI message
    const placeholderId = `ai_${Date.now()}`;
    setMessages((prev) => [...prev, { _id: placeholderId, role: "assistant", content: "", isLoading: true }]);

    try {
      const res = await sendChatMessage(finalQuery, activeConvId || null);
      const { conversationId, title, answer, mode } = res.data;

      // Set conversation context if new
      if (!activeConvId) {
        setActiveConvId(conversationId);
        setActiveTitle(title);
        // Add to list
        setConversations((prev) => [
          { _id: conversationId, title, messageCount: 2, updatedAt: new Date().toISOString(), lastMode: mode },
          ...prev,
        ]);
      } else {
        // Update title if it changed (auto-rename from first msg)
        setActiveTitle(title);
        setConversations((prev) =>
          prev.map((c) => c._id === conversationId ? { ...c, title, updatedAt: new Date().toISOString(), lastMode: mode } : c)
        );
      }

      // Replace placeholder with real AI message
      setMessages((prev) =>
        prev.map((m) =>
          m._id === placeholderId
            ? { _id: `ai_real_${Date.now()}`, role: "assistant", content: answer, mode, timestamp: new Date().toISOString() }
            : m
        )
      );

    } catch (err) {
      console.error("Chat error:", err);
      const errMsg = err.response?.data?.message || "Something went wrong. Please try again.";
      setMessages((prev) =>
        prev.map((m) =>
          m._id === placeholderId
            ? { _id: `err_${Date.now()}`, role: "assistant", content: `⚠️ ${errMsg}`, isError: true, timestamp: new Date().toISOString() }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // ── Auto scroll ────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Rename ─────────────────────────────────────────────────
  const startRename = (id, currentTitle) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
    setMenuOpenId(null);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const commitRename = async (id) => {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenamingId(null); return; }
    try {
      await renameConversation(id, trimmed);
      setConversations((prev) => prev.map((c) => c._id === id ? { ...c, title: trimmed } : c));
      if (activeConvId === id) setActiveTitle(trimmed);
    } catch { /* ignore */ }
    setRenamingId(null);
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setMenuOpenId(null);
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (activeConvId === id) newChat();
    } catch { /* ignore */ }
  };

  // ── Pin ────────────────────────────────────────────────────
  const handlePin = async (id, currentPinned) => {
    setMenuOpenId(null);
    try {
      await pinConversation(id, !currentPinned);
      setConversations((prev) => prev.map((c) => c._id === id ? { ...c, isPinned: !currentPinned } : c));
    } catch { /* ignore */ }
  };

  // ── Clear all ──────────────────────────────────────────────
  const handleClearAll = async () => {
    if (!window.confirm("सर्व संभाषणे कायमची हटवायची का?\n\nDelete all conversations permanently?")) return;
    try {
      await clearAllConversations();
      setConversations([]);
      newChat();
    } catch { /* ignore */ }
  };

  // ── Logout ─────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // ── Close menu on outside click ────────────────────────────
  useEffect(() => {
    const handler = () => setMenuOpenId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ── Keyboard: Ctrl+Enter to send ──────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Filtered conversations ─────────────────────────────────
  const filteredConvs = conversations.filter((c) =>
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const grouped = groupConversations(filteredConvs);

  // ── Conversation list item ─────────────────────────────────
  const ConvItem = ({ conv }) => {
    const isActive  = conv._id === activeConvId;
    const isRenaming = renamingId === conv._id;
    const isMenuOpen = menuOpenId === conv._id;

    return (
      <div
        className={`group relative flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
          isActive
            ? "bg-slate-700 text-white dark:bg-slate-700/80"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`}
        onClick={() => !isRenaming && openConversation(conv._id)}
      >
        <FiMessageSquare className="w-4 h-4 shrink-0 opacity-60" />

        {isRenaming ? (
          <input
            ref={renameInputRef}
            className="flex-1 bg-slate-600 text-white text-sm rounded px-1 py-0.5 outline-none min-w-0"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => commitRename(conv._id)}
            onKeyDown={(e) => {
              if (e.key === "Enter")  commitRename(conv._id);
              if (e.key === "Escape") setRenamingId(null);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate text-sm leading-5">{conv.title}</span>
        )}

        {/* Context menu button */}
        {!isRenaming && (
          <button
            className={`p-1 rounded hover:bg-slate-600 transition-opacity ${isActive || isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : conv._id); }}
          >
            <FiMoreHorizontal className="w-4 h-4" />
          </button>
        )}

        {/* Dropdown menu */}
        {isMenuOpen && (
          <div
            className="absolute right-0 top-8 z-50 w-40 bg-slate-700 border border-slate-600 rounded-lg shadow-xl py-1 text-white text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-600"
              onClick={() => startRename(conv._id, conv.title)}>
              <FiEdit2 className="w-3.5 h-3.5" /> Rename
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-600"
              onClick={() => handlePin(conv._id, conv.isPinned)}>
              <FiBookmark className="w-3.5 h-3.5" /> {conv.isPinned ? "Unpin" : "Pin"}
            </button>
            <div className="border-t border-slate-600 my-1" />
            <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-600 text-red-400 hover:text-white"
              onClick={() => handleDelete(conv._id)}>
              <FiTrash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">

      {/* ──────────────────────────────────────────────────────
          SIDEBAR
      ────────────────────────────────────────────────────── */}
      <aside
        className={`flex flex-col bg-slate-900 dark:bg-slate-950 transition-all duration-300 ${sidebarOpen ? "w-64" : "w-0"} shrink-0 overflow-hidden`}
      >

        {/* Logo + header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-700/50">
          <img src={Logo} alt="Logo" className="w-8 h-8 object-contain rounded" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">तपास किरण</p>
            <p className="text-slate-400 text-xs truncate">Tapas Kiran AI</p>
          </div>
        </div>

        {/* New Chat button */}
        <div className="px-3 py-3">
          <button
            onClick={newChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors shadow"
          >
            <FiPlus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
            <FiSearch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-slate-300 placeholder-slate-500 text-xs flex-1 outline-none"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">

          {isFetchingConvs ? (
            <div className="py-8 text-center text-slate-500 text-sm">Loading...</div>
          ) : filteredConvs.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs leading-relaxed px-4">
              {searchQuery ? "No chats found" : "No conversations yet.\nStart a new chat!"}
            </div>
          ) : (
            Object.entries(grouped).map(([group, convs]) =>
              convs.length > 0 && (
                <div key={group}>
                  <p className="text-slate-500 text-xs px-2 py-1.5 font-medium uppercase tracking-wide">{group}</p>
                  {convs.map((conv) => <ConvItem key={conv._id} conv={conv} />)}
                </div>
              )
            )
          )}
        </div>

        {/* Bottom: Clear all + User + Logout */}
        <div className="border-t border-slate-700/50 p-3 space-y-1">
          <button
            onClick={handleClearAll}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg text-sm transition-colors"
          >
            <FiTrash2 className="w-4 h-4" />
            <span>Clear all chats</span>
          </button>

          {/* User info */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-xs font-medium truncate">{user?.name || "Officer"}</p>
              <p className="text-slate-500 text-xs truncate">{user?.policeStation || ""}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ──────────────────────────────────────────────────────
          MAIN AREA
      ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 transition-colors"
          >
            <FiMenu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            {activeConvId ? (
              <button
                onClick={() => activeConvId && startRename(activeConvId, activeTitle)}
                className="group flex items-center gap-1.5 text-left"
                title="Click to rename"
              >
                <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-xs group-hover:text-blue-600 transition-colors">
                  {activeTitle || "Conversation"}
                </h1>
                <FiEdit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
              </button>
            ) : (
              <div>
                <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">तपास किरण — Maharashtra Police AI</h1>
                <p className="text-xs text-slate-400">SOP · Law · Forms · Case Law</p>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === "light" ? <FiMoon className="w-4 h-4" /> : <FiSun className="w-4 h-4" />}
          </button>

          {activeConvId && (
            <button
              onClick={() => handleDelete(activeConvId)}
              title="Delete this conversation"
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-500 transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          )}
        </header>

        {/* ── Messages area ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {isFetchingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex gap-1">
                {[0,150,300].map((d) => (
                  <span key={d} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>

          ) : (!activeConvId || messages.length === 0) && !isLoading ? (
            /* Welcome / empty state */
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-5 shadow-lg">
                <span className="text-white text-2xl font-bold">तक</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">तपास किरणमध्ये स्वागत आहे</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 max-w-sm leading-relaxed">
                Maharashtra Police SOP, law sections, IIF forms, and investigation guidance — all in one AI assistant.
              </p>

              {/* Quick start cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => sendMessage(q.prompt)}
                    disabled={isLoading}
                    className="flex items-start gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-left hover:border-orange-300 hover:shadow-md transition-all disabled:opacity-50"
                  >
                    <span className="mt-0.5 text-orange-500">{q.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-100">{q.label}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{q.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          ) : (
            /* Message list */
            <div className="py-4 max-w-3xl mx-auto w-full">
              {messages.map((msg) => <MessageBubble key={msg._id} msg={msg} />)}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* ── Input area (Chat Composer) ───────────────────── */}
        <ChatComposer
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          handleKeyDown={handleKeyDown}
          sendMessage={sendMessage}
          attachedFile={attachedFile}
          fileError={fileError}
          handleFileChange={handleFileChange}
          clearAttachment={clearAttachment}
          isRecording={isRecording}
          startVoiceInput={startVoiceInput}
          stopVoiceInput={stopVoiceInput}
          inputRef={inputRef}
        />

      </main>
    </div>
  );
}
