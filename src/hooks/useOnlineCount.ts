import { useEffect, useState } from "react";
import { onlineClient } from "../lib/online-client";
import { type Lang } from "../lib/i18n";

// Shared in-memory state so multiple components remain in exact sync
let globalOnlineCount = 54;
const listeners = new Set<(count: number) => void>();

function setGlobalCount(count: number) {
  globalOnlineCount = count;
  listeners.forEach((fn) => fn(count));
}

let isInitialized = false;

function initOnlineCountTracking() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  // 1. Initial fetch from server
  fetch("/api/online-count")
    .then((res) => {
      if (res.ok) return res.json();
      return fetch("/health").then((r) => r.json());
    })
    .then((data) => {
      if (typeof data?.onlineCount === "number") {
        setGlobalCount(data.onlineCount);
      } else if (typeof data?.metrics?.socketMappings === "number") {
        setGlobalCount(data.metrics.socketMappings + 50);
      }
    })
    .catch(() => {
      /* fallback to default */
    });

  // 2. Real-time Socket.IO listener
  try {
    onlineClient.connect();
    onlineClient.on("system:online_count", (data) => {
      if (typeof data?.onlineCount === "number") {
        setGlobalCount(data.onlineCount);
      }
    });
  } catch (err) {
    console.warn("Online tracking socket notice:", err);
  }
}

/**
 * Converts Western digits to Khmer digits
 */
function toKhmerDigits(num: number | string): string {
  const khmerDigits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
  return String(num).replace(/[0-9]/g, (w) => khmerDigits[parseInt(w, 10)]);
}

/**
 * Formats online count string localized for each supported language
 */
export function formatOnlineCount(count: number, lang: Lang = "vi"): string {
  if (lang === "km") {
    const formatted = toKhmerDigits(count.toLocaleString("en-US"));
    return `${formatted} នាក់កំពុងលេង`;
  }
  if (lang === "en") {
    return `${count.toLocaleString("en-US")} online`;
  }
  if (lang === "fr") {
    return `${count.toLocaleString("fr-FR")} en ligne`;
  }
  if (lang === "th") {
    return `${count.toLocaleString("th-TH")} ออนไลน์`;
  }
  if (lang === "zh") {
    return `${count.toLocaleString("zh-CN")} 在线`;
  }
  // Default Vietnamese
  return `${count.toLocaleString("vi-VN")} đang trực tuyến`;
}

/**
 * React hook to access live online player count
 */
export function useOnlineCount(lang?: Lang) {
  const [count, setCount] = useState<number>(globalOnlineCount);

  useEffect(() => {
    initOnlineCountTracking();
    setCount(globalOnlineCount);

    const handler = (newCount: number) => {
      setCount(newCount);
    };

    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    count,
    formatted: formatOnlineCount(count, lang),
  };
}
