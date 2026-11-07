"use client";

import { useEffect, useState, useRef } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  KeyRound,
  Laptop,
  LogIn,
  LogOut,
  ShieldAlert,
  X,
} from "lucide-react";
import type { SecurityNotification } from "@/lib/auth-security";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok && active) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // Keep existing state
      }
    };

    void fetchNotifications();
    const interval = setInterval(() => {
      void fetchNotifications();
    }, 45000); // refresh every 45s
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function markAllRead() {
    setLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }

  async function markSingleRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignored
    }
  }

  function getCategoryIcon(cat: SecurityNotification["category"]) {
    switch (cat) {
      case "login":
        return <LogIn size={14} className="notif-cat-icon text-blue" />;
      case "new_device":
        return <Laptop size={14} className="notif-cat-icon text-teal" />;
      case "admin_otp":
        return <KeyRound size={14} className="notif-cat-icon text-violet" />;
      case "session_revocation":
        return <LogOut size={14} className="notif-cat-icon text-amber" />;
      case "security_alert":
        return <ShieldAlert size={14} className="notif-cat-icon text-rose" />;
      default:
        return <Bell size={14} className="notif-cat-icon text-slate" />;
    }
  }

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        type="button"
        className="icon-button notification-bell-button"
        aria-label="Security Notifications"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <div>
              <strong>Security Notifications</strong>
              <span className="notif-subtext">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="mark-all-read-btn"
                onClick={() => void markAllRead()}
                disabled={loading}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={20} />
                <span>No security alerts recorded.</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.isRead ? "read" : "unread"}`}
                  onClick={() => !notif.isRead && void markSingleRead(notif.id)}
                >
                  <div className="notif-icon-col">{getCategoryIcon(notif.category)}</div>
                  <div className="notif-body">
                    <div className="notif-title-row">
                      <strong>{notif.title}</strong>
                      {!notif.isRead && <span className="unread-dot" />}
                    </div>
                    <p>{notif.message}</p>
                    <span className="notif-time">
                      <Clock size={11} />
                      {new Intl.DateTimeFormat("en-PK", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Karachi",
                      }).format(new Date(notif.createdAt))}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

