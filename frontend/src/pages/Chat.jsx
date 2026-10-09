import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useChatSocket } from "../hooks/useChatSocket";
import {
  getChatUsers,
  getConversations,
  getMessages,
  markConversationRead,
  openDirectConversation,
} from "../api/chat";
import { getErrorMessage } from "../api/errors";
import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";

// userId was never saved by the login flow.
function getMyIdFromToken() {
  try {
    const token = localStorage.getItem("access_token");
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return Number(JSON.parse(atob(base64)).sub);
  } catch {
    return NaN;
  }
}

export default function Chat() {
  const { userId } = useAuth();
  const myId = Number(userId) || getMyIdFromToken();

  const [conversations, setConversations] = useState([]);
  const [people, setPeople] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messagesByConv, setMessagesByConv] = useState({});
  const [loadingList, setLoadingList] = useState(true);

  // Refs give the socket handler the *current* values without making it
  // re-create (and re-subscribe) on every render.
  const conversationsRef = useRef([]);
  const activeIdRef = useRef(null);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      setConversations(res.data);
    } catch {
      /* keep what we have */
    }
  }, []);

  const loadMessages = useCallback(async (conversationId) => {
    try {
      const res = await getMessages(conversationId);
      setMessagesByConv((prev) => ({ ...prev, [conversationId]: res.data }));
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load messages"));
      // Stop the "Loading..." state so the chat is still usable
      setMessagesByConv((prev) => (prev[conversationId] ? prev : { ...prev, [conversationId]: [] }));
    }
  }, []);

  // Initial load (with the ignore guard, so StrictMode can't cause stale overwrites)
  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const [convRes, peopleRes] = await Promise.all([getConversations(), getChatUsers()]);
        if (!ignore) {
          setConversations(convRes.data);
          setPeople(peopleRes.data);
        }
      } catch (error) {
        if (!ignore) toast.error(getErrorMessage(error, "Failed to load chats"));
      } finally {
        if (!ignore) setLoadingList(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, []);

  // Everything the server pushes to us arrives here.
  const handleSocketMessage = useCallback(
    (event) => {
      if (event.type === "error") {
        toast.error(event.detail || "Message failed");
        return;
      }
      if (event.type !== "message") return;

      const msg = event.message;
      const convId = msg.conversation_id;

      // Add to the open message list (skip duplicates)
      setMessagesByConv((prev) => {
        const existing = prev[convId];
        // Not loaded and not open: skip it, the history fetch will include it.
        if (!existing && activeIdRef.current !== convId) return prev;
        const list = existing || [];
        if (list.some((m) => m.id === msg.id)) return prev;
        return { ...prev, [convId]: [...list, msg] };
      });

      // Someone started a brand-new chat with us: fetch it.
      if (!conversationsRef.current.some((c) => c.id === convId)) {
        refreshConversations();
        return;
      }

      const isActive = activeIdRef.current === convId;
      const fromMe = msg.sender_id === myId;

      // Move this conversation to the top with the new preview.
      setConversations((prev) => {
        const target = prev.find((c) => c.id === convId);
        if (!target) return prev;
        const updated = {
          ...target,
          last_message: msg,
          unread_count: isActive || fromMe ? 0 : target.unread_count + 1,
        };
        return [updated, ...prev.filter((c) => c.id !== convId)];
      });

      if (isActive && !fromMe) markConversationRead(convId).catch(() => {});
    },
    [myId, refreshConversations]
  );

  const { status, send } = useChatSocket(handleSocketMessage);

  // If the connection dropped and came back, we may have missed messages: re-sync.
  const hadConnection = useRef(false);
  useEffect(() => {
    if (status !== "open") return;
    if (hadConnection.current) {
      refreshConversations();
      if (activeIdRef.current) loadMessages(activeIdRef.current);
    }
    hadConnection.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const selectConversation = useCallback(
    (id) => {
      setActiveId(id);

      const conv = conversationsRef.current.find((c) => c.id === id);
      if (conv && conv.unread_count > 0) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
        );
        markConversationRead(id).catch(() => {});
      }

      loadMessages(id);
    },
    [loadMessages]
  );

  const startChat = useCallback(
    async (person) => {
      const existing = conversationsRef.current.find((c) => c.other_user.id === person.id);
      if (existing) {
        selectConversation(existing.id);
        return;
      }
      try {
        const res = await openDirectConversation(person.id);
        setConversations((prev) =>
          prev.some((c) => c.id === res.data.id) ? prev : [res.data, ...prev]
        );
        selectConversation(res.data.id);
      } catch (error) {
        toast.error(getErrorMessage(error, "Could not start chat"));
      }
    },
    [selectConversation]
  );

  const handleSend = (content) => {
    const ok = send({ type: "message", conversation_id: activeId, content });
    if (!ok) toast.error("Not connected. Reconnecting...");
    return ok;
  };

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  return (
    <div className={`chat-shell ${activeId ? "chat-shell-open" : ""}`}>
      <ConversationList
        conversations={conversations}
        people={people}
        activeId={activeId}
        status={status}
        loading={loadingList}
        onSelect={selectConversation}
        onStartChat={startChat}
      />
      <ChatWindow
        conversation={activeConversation}
        messages={activeId ? messagesByConv[activeId] : []}
        loading={activeId ? messagesByConv[activeId] === undefined : false}
        myId={myId}
        canSend={status === "open"}
        onSend={handleSend}
        onBack={() => setActiveId(null)}
      />
    </div>
  );
}