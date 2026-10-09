import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Search, Settings2, Users } from "lucide-react";
import Avatar from "./Avatar";
import { formatTime, truncate } from "./chatUtils";

const STATUS_LABEL = {
  open: "Connected",
  connecting: "Connecting...",
  closed: "Offline, retrying...",
};

export default function ConversationList({
  conversations,
  people,
  activeId,
  status,
  loading,
  onSelect,
  onStartChat,
}) {
  const [tab, setTab] = useState("chats");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredChats = conversations.filter((c) =>
    c.other_user.username.toLowerCase().includes(q)
  );
  const filteredPeople = people.filter((p) => p.username.toLowerCase().includes(q));
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <div className="chat-list-title">
          Messages
          <span
            className={`chat-conn chat-conn-${status}`}
            title={STATUS_LABEL[status]}
          />
        </div>
        <Link to="/chat/visibility" className="chat-icon-link" title="Who can see me">
          <Settings2 size={18} />
        </Link>
      </div>

      <div className="chat-tabs">
        <button
          type="button"
          className={`chat-tab ${tab === "chats" ? "chat-tab-active" : ""}`}
          onClick={() => setTab("chats")}
        >
          <MessageCircle size={15} />
          Chats
          {totalUnread > 0 && <span className="chat-badge">{totalUnread}</span>}
        </button>
        <button
          type="button"
          className={`chat-tab ${tab === "people" ? "chat-tab-active" : ""}`}
          onClick={() => setTab("people")}
        >
          <Users size={15} />
          People
        </button>
      </div>

      <div className="chat-search">
        <Search size={15} />
        <input
          type="text"
          placeholder={tab === "chats" ? "Search chats" : "Search people"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="chat-items">
        {loading ? (
          <div className="chat-empty-list">Loading...</div>
        ) : tab === "chats" ? (
          filteredChats.length === 0 ? (
            <div className="chat-empty-list">
              {conversations.length === 0
                ? "No conversations yet. Open the People tab to start one."
                : "No chats match your search."}
            </div>
          ) : (
            filteredChats.map((c) => {
              // A message can expire while the page is open, so hide stale previews.
              const last =
                c.last_message && new Date(c.last_message.expires_at) > new Date()
                  ? c.last_message
                  : null;

              // In a 1-on-1 chat, a message is mine if the other person didn't send it.
              const lastIsMine = last && last.sender_id !== c.other_user.id;
              const preview = last
                ? `${lastIsMine ? "You: " : ""}${truncate(last.content, 20)}`
                : "No recent messages";

              return (
                <button
                  key={c.id}
                  type="button"
                  className={`chat-item ${activeId === c.id ? "chat-item-active" : ""}`}
                  onClick={() => onSelect(c.id)}
                >
                  <Avatar name={c.other_user.username} />
                  <div className="chat-item-body">
                    <div className="chat-item-top">
                      <span className="chat-item-name">{c.other_user.username}</span>
                      {last && (
                        <span
                          className={`chat-item-time ${
                            c.unread_count > 0 ? "chat-item-time-unread" : ""
                          }`}
                        >
                          {formatTime(last.sent_at)}
                        </span>
                      )}
                    </div>
                    <div className="chat-item-bottom">
                      <span className="chat-item-preview">{preview}</span>
                      {c.unread_count > 0 && <span className="chat-badge">{c.unread_count}</span>}
                    </div>
                  </div>
                </button>
              );
            })
          )
        ) : filteredPeople.length === 0 ? (
          <div className="chat-empty-list">
            {people.length === 0
              ? "Nobody is visible to you yet. People show up here when they are visible to everyone, or share a region with you."
              : "No one matches your search."}
          </div>
        ) : (
          filteredPeople.map((p) => (
            <button
              key={p.id}
              type="button"
              className="chat-item"
              onClick={() => {
                onStartChat(p);
                setTab("chats");
              }}
            >
              <Avatar name={p.username} />
              <div className="chat-item-body">
                <div className="chat-item-name">{p.username}</div>
                <div className="chat-item-preview">Tap to start chatting</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}