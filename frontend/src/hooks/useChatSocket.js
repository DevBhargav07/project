import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_URL } from "../api/axios";

// Opens one WebSocket for the logged-in user, reconnects automatically
// with a growing delay if it drops, and hands every incoming event to
// `onMessage`. Returns { status, send }.
export function useChatSocket(onMessage) {
  const [status, setStatus] = useState("connecting"); // connecting | open | closed
  const socketRef = useRef(null);
  const handlerRef = useRef(onMessage);

  // Always call the latest handler without re-opening the socket.
  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let stopped = false;
    let retry = 0;
    let timer = null;

    const connect = () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const url = `${BASE_URL.replace(/^http/, "ws")}/chat/ws?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      socketRef.current = ws;
      setStatus("connecting");

      ws.onopen = () => {
        retry = 0;
        setStatus("open");
      };

      ws.onmessage = (event) => {
        try {
          handlerRef.current?.(JSON.parse(event.data));
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = (event) => {
        if (stopped) return; // intentional close (unmount / StrictMode re-run)
        setStatus("closed");
        if (event.code === 4401) return; // unauthorized, retrying won't help
        const delay = Math.min(1000 * 2 ** retry, 10000);
        retry += 1;
        timer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(timer);
      socketRef.current?.close();
    };
  }, []);

  const send = useCallback((payload) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  return { status, send };
}