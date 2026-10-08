import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowLeft, Clock, MessageCircle, Send } from "lucide-react";
import Avatar from "./Avatar";
import { dayLabel, formatTime } from "./chatUtils";

export default function ChatWindow({
  conversation,
  messages,
  loading,
  myId,
  canSend,
  onSend,
  onBack,
}) {
  const [text, setText] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const lastConvId = useRef(null);

  // Re-check every 30s so messages vanish from the screen when they expire,
  // without needing a refresh.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const visible = (messages || []).filter((m) => new Date(m.expires_at).getTime() > now);

  // Jump instantly when switching chats, scroll smoothly for new messages.
  useEffect(() => {
    const switched = lastConvId.current !== conversation?.id;
    lastConvId.current = conversation?.id;
    bottomRef.current?.scrollIntoView({ behavior: switched ? "auto" : "smooth" });
  }, [conversation?.id, visible.length]);

  // New chat opened: clear the draft, and focus the box on desktop only
  // (on phones that would pop the keyboard open).
  useEffect(() => {
    setText("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      if (window.matchMedia("(min-width: 861px)").matches) inputRef.current.focus();
    }
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <div className="chat-window chat-placeholder">
        <MessageCircle size={52} />
        <h2>Pick a conversation</h2>
        <p>Choose a chat on the left, or find someone in the People tab.</p>
      </div>
    );
  }

  const autoGrow = (el) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const submit = () => {
    const content = text.trim();
    if (!content) return;
    if (onSend(content)) {
      setText("");
      if (inputRef.current) inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e) => {
    // Enter sends, Shift+Enter inserts a new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <button type="button" className="chat-back-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <Avatar name={conversation.other_user.username} size={40} />
        <div>
          <div className="chat-window-name">{conversation.other_user.username}</div>
          <div className="chat-window-sub">Messages disappear after 24 hours</div>
        </div>
      </div>

      <div className="chat-messages">
        <div className="chat-note">
          <Clock size={13} />
          Messages in this chat are deleted 24 hours after they are sent.
        </div>

        {loading && visible.length === 0 && (
          <div className="chat-note">Loading messages...</div>
        )}

        {visible.map((m, i) => {
          const prev = visible[i - 1];
          const mine = m.sender_id === myId;
          const newDay = !prev || dayLabel(prev.sent_at) !== dayLabel(m.sent_at);
          const groupStart = !prev || newDay || prev.sender_id !== m.sender_id;

          return (
            <Fragment key={m.id}>
              {newDay && (
                <div className="chat-day">
                  <span>{dayLabel(m.sent_at)}</span>
                </div>
              )}
              <div
                className={`chat-row ${mine ? "chat-row-mine" : ""} ${
                  groupStart ? "chat-row-start" : ""
                }`}
              >
                <div
                  className={`chat-bubble ${
                    mine ? "chat-bubble-mine" : "chat-bubble-theirs"
                  }`}
                  title={`Disappears ${new Date(m.expires_at).toLocaleString()}`}
                >
                  <span className="chat-bubble-text">{m.content}</span>
                  <span className="chat-time">{formatTime(m.sent_at)}</span>
                </div>
              </div>
            </Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-composer">
        <textarea
          ref={inputRef}
          className="chat-input"
          rows={1}
          maxLength={4000}
          placeholder={canSend ? "Type a message" : "Reconnecting..."}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            autoGrow(e.target);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="chat-send-btn"
          onClick={submit}
          disabled={!canSend || !text.trim()}
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}