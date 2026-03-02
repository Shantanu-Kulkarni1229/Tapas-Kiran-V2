import React, { useState, useRef, useEffect } from "react";
import { ReactTransliterate } from "react-transliterate";
import "react-transliterate/dist/index.css";
import API from "../api";

const Homepage = () => {
  // Voice recognition states
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const recognitionRef = useRef(null);

  // Transliteration states
  const [typingText, setTypingText] = useState("");
  const [showTypingPanel, setShowTypingPanel] = useState(false);

  // Theme detection state
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Detect user's theme preference
  useEffect(() => {
    const checkTheme = () => {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Check if user has manually set dark mode (common patterns)
      const htmlElement = document.documentElement;
      const bodyElement = document.body;
      
      const hasDarkClass = htmlElement.classList.contains('dark') || 
                          bodyElement.classList.contains('dark') ||
                          htmlElement.classList.contains('theme-dark') ||
                          bodyElement.classList.contains('theme-dark');
      
      // Check computed background color
      const bodyBgColor = window.getComputedStyle(bodyElement).backgroundColor;
      const htmlBgColor = window.getComputedStyle(htmlElement).backgroundColor;
      
      // Parse RGB values to determine if background is dark
      const isDarkBg = (bgColor) => {
        if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') return false;
        const rgb = bgColor.match(/\d+/g);
        if (rgb) {
          const [r, g, b] = rgb.map(Number);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          return brightness < 128;
        }
        return false;
      };
      
      const isDark = prefersDark || hasDarkClass || isDarkBg(bodyBgColor) || isDarkBg(htmlBgColor);
      setIsDarkTheme(isDark);
    };

    checkTheme();
    
    // Listen for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => checkTheme();
    mediaQuery.addListener(handleChange);
    
    // Also listen for class changes on html/body
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      mediaQuery.removeListener(handleChange);
      observer.disconnect();
    };
  }, []);

  const initializeRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = "mr-IN"; // Marathi
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setIsProcessing(true);
      setShowTextPanel(true);
    };

    recognitionRef.current.onresult = (event) => {
      setIsProcessing(false);
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText(transcript);
    };

    recognitionRef.current.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      setIsProcessing(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      setIsProcessing(false);
    };
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      initializeRecognition();
      recognitionRef.current.start();
    }
  };

  const clearVoiceText = () => {
    setText("");
    setShowTextPanel(false);
  };

  const sendVoiceText = () => {
    console.log("Sending voice text:", text);
    setText("");
    setShowTextPanel(false);
  };

  const toggleTypingPanel = () => {
    setShowTypingPanel(!showTypingPanel);
    if (showTextPanel) {
      setShowTextPanel(false);
    }
  };

  const clearTypingText = () => {
    setTypingText("");
    setShowTypingPanel(false);
  };

  const sendTypingText = () => {
    console.log("Sending typing text:", typingText);
    setTypingText("");
    setShowTypingPanel(false);
  };
 
const handleLogout = async () => {
  try {
    const res = await API.post("auth/logout"); // <-- API call
    if (res.status === 200) {
      localStorage.removeItem("token");        // clear JWT
      window.location.href = "/login";         // redirect
    }
  } catch (error) {
    console.error("Logout failed:", error.response?.data || error.message);
    alert("Logout failed. Please try again.");
  }
};


  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, position: 'relative' }}>
      {/* Logout button */}
      <button
        onClick={handleLogout}
        style={{
          position: 'fixed',
          top: 'clamp(10px, 2vh, 20px)',
          right: 'clamp(10px, 2vw, 20px)',
          zIndex: 10000,
          background: '#ef4444',
          border: 'none',
          borderRadius: 'clamp(20px, 4vw, 24px)',
          width: 'auto',
          minWidth: 'clamp(100px, 20vw, 120px)',
          height: 'clamp(36px, 6vw, 42px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transition: 'all 0.2s ease',
          padding: '0 clamp(12px, 2vw, 16px)',
          color: 'white',
          fontWeight: '500',
          fontSize: 'clamp(12px, 2.5vw, 14px)',
          gap: '8px',
          ':hover': {
            background: '#dc2626',
            transform: 'translateY(-1px)'
          }
        }}
      >
        <svg 
          width="clamp(14px, 3vw, 18px)" 
          height="clamp(14px, 3vw, 18px)" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M17 16L21 12M21 12L17 8M21 12H7M13 16V17C13 18.1046 12.1046 19 11 19H7C5.89543 19 5 18.1046 5 17V7C5 5.89543 5.89543 5 7 5H11C12.1046 5 13 5.89543 13 7V8" 
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        LOGOUT
      </button>

      {/* Chatbot iframe */}
      <iframe
        src="https://cdn.botpress.cloud/webchat/v3.2/shareable.html?configUrl=https://files.bpcontent.cloud/2025/08/06/18/20250806183435-8IZ9LGKM.json"
        // https://cdn.botpress.cloud/webchat/v3.2/shareable.html?configUrl=https://files.bpcontent.cloud/2025/08/06/18/20250806183435-8IZ9LGKM.json
        frameBorder="0"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
        className="chatbot-iframe"
        title="Chatbot"
      />

      {/* Voice input interface */}
      {(showTextPanel || text) && (
        <div
          style={{
            position: "fixed",
            bottom: "clamp(160px, 25vh, 250px)",
            right: "clamp(10px, 3vw, 30px)",
            left: "clamp(10px, 3vw, auto)",
            maxWidth: "min(400px, calc(100vw - 40px))",
            marginLeft: "auto",
            backgroundColor: isDarkTheme ? "#1e293b" : "#fff",
            borderRadius: "clamp(12px, 2vw, 20px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            padding: "clamp(12px, 3vw, 20px)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(8px, 2vw, 15px)",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h4 style={{ 
              margin: 0, 
              color: isDarkTheme ? "#f8fafc" : "#333", 
              fontWeight: 500,
              fontSize: "clamp(14px, 2.5vw, 16px)"
            }}>
              Marathi Voice Input
            </h4>
            <button
              onClick={clearVoiceText}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: isDarkTheme ? "#94a3b8" : "#666",
                fontSize: "clamp(18px, 3vw, 20px)",
                padding: "5px",
                minWidth: "24px",
                minHeight: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Clear text"
            >
              ×
            </button>
          </div>
          
          <div
            style={{
              minHeight: "clamp(80px, 15vw, 120px)",
              maxHeight: "clamp(200px, 30vw, 300px)",
              overflowY: "auto",
              padding: "clamp(8px, 2vw, 12px)",
              backgroundColor: isDarkTheme ? "#0f172a" : "#f8f8f8",
              borderRadius: "clamp(8px, 1.5vw, 12px)",
              color: isDarkTheme ? "#e2e8f0" : "#333",
              border: isProcessing ? (isDarkTheme ? "1px dashed #60a5fa" : "1px dashed #2563eb") : (isDarkTheme ? "1px solid #334155" : "1px solid #eee"),
              fontSize: "clamp(13px, 2.5vw, 14px)",
              lineHeight: "1.4",
            }}
          >
            {text || (isProcessing ? "Processing speech..." : "Speak now...")}
          </div>
          
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "clamp(8px, 2vw, 10px)",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={toggleListening}
              style={{
                flex: 1,
                minWidth: "80px",
                padding: "clamp(8px, 2vw, 10px)",
                borderRadius: "clamp(6px, 1.5vw, 8px)",
                background: isListening ? "#dc2626" : "#2563eb",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "clamp(12px, 2.5vw, 14px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isListening ? "Stop" : "Speak"}
            </button>
            
            {text && (
              <button
                onClick={sendVoiceText}
                style={{
                  flex: 1,
                  minWidth: "80px",
                  padding: "clamp(8px, 2vw, 10px)",
                  borderRadius: "clamp(6px, 1.5vw, 8px)",
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "clamp(12px, 2.5vw, 14px)",
                }}
              >
                Send
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transliteration typing interface */}
      {showTypingPanel && (
        <div
          style={{
            position: "fixed",
            bottom: "clamp(160px, 25vh, 250px)",
            right: "clamp(10px, 3vw, 30px)",
            left: "clamp(10px, 3vw, auto)",
            maxWidth: "min(400px, calc(100vw - 40px))",
            marginLeft: "auto",
            backgroundColor: isDarkTheme ? "#1e293b" : "#fff",
            borderRadius: "clamp(12px, 2vw, 20px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            padding: "clamp(12px, 3vw, 20px)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(8px, 2vw, 15px)",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h4 style={{ 
              margin: 0, 
              color: isDarkTheme ? "#f8fafc" : "#333", 
              fontWeight: 500,
              fontSize: "clamp(14px, 2.5vw, 16px)"
            }}>
              Marathi Typing
            </h4>
            <button
              onClick={clearTypingText}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: isDarkTheme ? "#94a3b8" : "#666",
                fontSize: "clamp(18px, 3vw, 20px)",
                padding: "5px",
                minWidth: "24px",
                minHeight: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Clear text"
            >
              ×
            </button>
          </div>
          
          <ReactTransliterate
            value={typingText}
            onChangeText={(text) => setTypingText(text)}
            lang="mr"
            placeholder="Type in Marathi..."
            style={{
              minHeight: "clamp(80px, 15vw, 120px)",
              maxHeight: "clamp(200px, 30vw, 300px)",
              padding: "clamp(8px, 2vw, 12px)",
              backgroundColor: isDarkTheme ? "#0f172a" : "#f8f8f8",
              borderRadius: "clamp(8px, 1.5vw, 12px)",
              color: isDarkTheme ? "#e2e8f0" : "#333",
              border: isDarkTheme ? "1px solid #334155" : "1px solid #eee",
              width: "100%",
              fontFamily: "inherit",
              fontSize: "clamp(13px, 2.5vw, 14px)",
              lineHeight: "1.4",
              resize: "none",
              outline: "none",
              overflowY: "auto",
            }}
          />
          
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "clamp(8px, 2vw, 10px)",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={clearTypingText}
              style={{
                padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 15px)",
                borderRadius: "clamp(6px, 1.5vw, 8px)",
                background: isDarkTheme ? "#334155" : "#f1f1f1",
                color: isDarkTheme ? "#e2e8f0" : "#333",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "clamp(12px, 2.5vw, 14px)",
              }}
            >
              Clear
            </button>
            <button
              onClick={sendTypingText}
              style={{
                padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 15px)",
                borderRadius: "clamp(6px, 1.5vw, 8px)",
                background: "#16a34a",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "clamp(12px, 2.5vw, 14px)",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Desktop floating action buttons */}
      <div
        style={{
          position: "fixed",
          bottom: "clamp(15px, 3vh, 30px)",
          right: "clamp(10px, 3vw, 30px)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "clamp(8px, 2vh, 15px)",
          alignItems: "flex-end",
        }}
        className="desktop-buttons"
      >
        {/* Voice button */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "clamp(3px, 1vh, 5px)",
          }}
        >
          <button
            onClick={toggleListening}
            style={{
              width: "clamp(50px, 12vw, 70px)",
              height: "clamp(50px, 12vw, 70px)",
              borderRadius: "50%",
              background: isListening ? "#dc2626" : "#2563eb",
              border: "none",
              color: "white",
              fontSize: "clamp(20px, 5vw, 28px)",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              transition: "all 0.2s ease",
              transform: isListening ? "scale(1.1)" : "scale(1)",
            }}
            title={isListening ? "Stop listening" : "Start speaking"}
          >
            {isListening ? (
              <div
                style={{
                  width: "clamp(16px, 4vw, 24px)",
                  height: "clamp(16px, 4vw, 24px)",
                  borderRadius: "2px",
                  backgroundColor: "white",
                }}
              />
            ) : (
              <div style={{ position: "relative" }}>
                <svg
                  width="clamp(20px, 5vw, 30px)"
                  height="clamp(20px, 5vw, 30px)"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 1C10.3431 1 9 2.34315 9 4V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V4C15 2.34315 13.6569 1 12 1Z"
                    fill="white"
                  />
                  <path
                    d="M5 10V12C5 15.866 8.13401 19 12 19C15.866 19 19 15.866 19 12V10M12 19V23M8 23H16"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {isProcessing && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-3px",
                      right: "-3px",
                      width: "clamp(8px, 2vw, 12px)",
                      height: "clamp(8px, 2vw, 12px)",
                      backgroundColor: "#fbbf24",
                      borderRadius: "50%",
                      border: "2px solid #2563eb",
                    }}
                  />
                )}
              </div>
            )}
          </button>
          <span 
            style={{ 
              color: isDarkTheme ? "#d1d5db" : "#4b5563", 
              textShadow: isDarkTheme ? "0 1px 3px rgba(0,0,0,0.8)" : "0 1px 3px rgba(255,255,255,0.8)", 
              fontSize: "clamp(10px, 2.5vw, 14px)",
              fontWeight: 500,
              textAlign: "center",
              background: isDarkTheme ? "rgba(15, 23, 42, 0.9)" : "rgba(255,255,255,0.9)",
              padding: "2px 6px",
              borderRadius: "8px",
              backdropFilter: "blur(4px)",
            }}
          >
            Marathi Voice
          </span>
        </div>

        {/* Typing button */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "clamp(3px, 1vh, 5px)",
          }}
        >
          <button
            onClick={toggleTypingPanel}
            style={{
              width: "clamp(45px, 10vw, 60px)",
              height: "clamp(45px, 10vw, 60px)",
              borderRadius: "50%",
              background: showTypingPanel ? "#16a34a" : "#3b82f6",
              border: "none",
              color: "white",
              fontSize: "clamp(18px, 4vw, 24px)",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              transition: "all 0.2s ease",
            }}
            title="Marathi Typing"
          >
            <svg
              width="clamp(18px, 4vw, 24px)"
              height="clamp(18px, 4vw, 24px)"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 7V17H20V7H4ZM4 5H20C21.1 5 22 5.9 22 7V17C22 18.1 21.1 19 20 19H4C2.9 19 2 18.1 2 17V7C2 5.9 2.9 5 4 5Z"
                fill="white"
              />
              <path
                d="M8 9H16V11H8V9ZM8 13H14V15H8V13Z"
                fill="white"
              />
            </svg>
          </button>
          <span 
            style={{ 
              color: isDarkTheme ? "#d1d5db" : "#4b5563", 
              textShadow: isDarkTheme ? "0 1px 3px rgba(0,0,0,0.8)" : "0 1px 3px rgba(255,255,255,0.8)", 
              fontSize: "clamp(10px, 2.5vw, 14px)",
              fontWeight: 500,
              textAlign: "center",
              background: isDarkTheme ? "rgba(15, 23, 42, 0.9)" : "rgba(255,255,255,0.9)",
              padding: "2px 6px",
              borderRadius: "8px",
              backdropFilter: "blur(4px)",
            }}
          >
            Marathi Typing
          </span>
        </div>
      </div>

      {/* Mobile/Tablet bottom toolbar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: isDarkTheme 
            ? "#111111" 
            : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          borderTop: isDarkTheme ? "1px solid #1e293b" : "1px solid #e2e8f0",
          padding: "12px 20px",
          zIndex: 9999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "30px",
          boxShadow: isDarkTheme 
            ? "0 -4px 15px rgba(0,0,0,0.3)" 
            : "0 -4px 15px rgba(0,0,0,0.1)",
          backdropFilter: "blur(8px)",
        }}
        className="mobile-buttons"
      >
        {/* Voice button */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <button
            onClick={toggleListening}
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: isListening ? "#dc2626" : "#2563eb",
              border: "none",
              color: "white",
              fontSize: "24px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              transition: "all 0.2s ease",
              transform: isListening ? "scale(1.05)" : "scale(1)",
            }}
            title={isListening ? "Stop listening" : "Start speaking"}
          >
            {isListening ? (
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "2px",
                  backgroundColor: "white",
                }}
              />
            ) : (
              <div style={{ position: "relative" }}>
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 1C10.3431 1 9 2.34315 9 4V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V4C15 2.34315 13.6569 1 12 1Z"
                    fill="white"
                  />
                  <path
                    d="M5 10V12C5 15.866 8.13401 19 12 19C15.866 19 19 15.866 19 12V10M12 19V23M8 23H16"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {isProcessing && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-3px",
                      right: "-3px",
                      width: "10px",
                      height: "10px",
                      backgroundColor: "#fbbf24",
                      borderRadius: "50%",
                      border: "2px solid #2563eb",
                    }}
                  />
                )}
              </div>
            )}
          </button>
          <span 
            style={{ 
              color: isDarkTheme ? "#d1d5db" : "#374151", 
              fontSize: "12px",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            Voice
          </span>
        </div>

        {/* Typing button */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <button
            onClick={toggleTypingPanel}
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: showTypingPanel ? "#16a34a" : "#3b82f6",
              border: "none",
              color: "white",
              fontSize: "22px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              transition: "all 0.2s ease",
            }}
            title="Marathi Typing"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 7V17H20V7H4ZM4 5H20C21.1 5 22 5.9 22 7V17C22 18.1 21.1 19 20 19H4C2.9 19 2 18.1 2 17V7C2 5.9 2.9 5 4 5Z"
                fill="white"
              />
              <path
                d="M8 9H16V11H8V9ZM8 13H14V15H8V13Z"
                fill="white"
              />
            </svg>
          </button>
          <span 
            style={{ 
              color: isDarkTheme ? "#d1d5db" : "#374151", 
              fontSize: "12px",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            Typing
          </span>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Desktop styles */
        .desktop-buttons {
          display: flex;
        }
        
        .mobile-buttons {
          display: none !important;
        }
        
        .chatbot-iframe {
          height: 100vh;
        }
        
        /* Mobile and Tablet styles */
        @media (max-width: 1024px) {
          .desktop-buttons {
            display: none !important;
          }
          
          .mobile-buttons {
            display: flex !important;
          }
          
          .chatbot-iframe {
            height: calc(100vh - 84px) !important;
          }
        }
        
        /* Extra adjustments for very small screens */
        @media (max-width: 480px) {
          .mobile-buttons {
            padding: 10px 15px !important;
            gap: 25px !important;
          }
          
          .chatbot-iframe {
            height: calc(100vh - 78px) !important;
          }
        }
        
        @media (max-width: 320px) {
          .mobile-buttons {
            padding: 8px 12px !important;
            gap: 20px !important;
          }
          
          .chatbot-iframe {
            height: calc(100vh - 74px) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Homepage;