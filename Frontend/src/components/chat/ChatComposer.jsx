import React from "react";
import { FiPaperclip, FiMic, FiMicOff, FiSend } from "react-icons/fi";

export default function ChatComposer({
  input,
  setInput,
  isLoading,
  handleKeyDown,
  sendMessage,
  attachedFile,
  fileError,
  handleFileChange,
  clearAttachment,
  isRecording,
  startVoiceInput,
  stopVoiceInput,
  inputRef,
}) {
  return (
    <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-3">
      <div className="max-w-3xl mx-auto space-y-2">
        {attachedFile && (
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
            <span className="flex items-center gap-2 truncate">
              <FiPaperclip className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{attachedFile.name}</span>
            </span>
            <button onClick={clearAttachment} className="ml-3 text-slate-500 hover:text-red-500 text-xs">
              Remove
            </button>
          </div>
        )}

        {fileError && <p className="text-xs text-red-500">{fileError}</p>}

        <div className="flex items-end gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl px-3 sm:px-4 py-2.5 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 dark:focus-within:ring-orange-900/40 transition-all shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5">
            <label className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors">
              <FiPaperclip className="w-4 h-4" />
              <input
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <button
              type="button"
              onClick={isRecording ? stopVoiceInput : startVoiceInput}
              title={isRecording ? "Stop voice input" : "Start voice input"}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border text-slate-500 dark:text-slate-300 transition-colors ${
                isRecording
                  ? "border-red-400 bg-red-50 dark:bg-red-950 text-red-600"
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {isRecording ? <FiMicOff className="w-4 h-4" /> : <FiMic className="w-4 h-4" />}
            </button>
          </div>

          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="तपास किरणला विचारा… (Ask Tapas Kiran...)"
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none resize-none leading-relaxed disabled:opacity-50 min-h-[24px] max-h-40"
            style={{ height: "24px" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="p-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-colors shrink-0"
          >
            <FiSend className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
