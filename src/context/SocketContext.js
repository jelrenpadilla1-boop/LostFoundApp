// src/context/SocketContext.js
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { scheduleLocalNotification } from '../services/notificationService';
import wsService from '../services/websocketService';
import { getToken } from '../utils/tokenStorage';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

const API_BASE_URL = 'http://10.116.78.132:8092/api';

export const SocketProvider = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [connected, setConnected] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  
  // User unread counts
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadMatches, setUnreadMatches] = useState(0);
  const [unreadLost, setUnreadLost] = useState(0);
  const [unreadFound, setUnreadFound] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Admin unread counts (for pending approvals)
  const [unreadAdminMatches, setUnreadAdminMatches] = useState(0);
  const [unreadAdminUsers, setUnreadAdminUsers] = useState(0);
  
  // Pending counts for admin badges
  const [pendingLostCount, setPendingLostCount] = useState(0);
  const [pendingFoundCount, setPendingFoundCount] = useState(0);
  const [pendingMatchesCount, setPendingMatchesCount] = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  const userChannelUnsubRef = useRef(null);
  const notifPollRef = useRef(null);
  const notificationListeners = useRef([]);
  const appState = useRef(AppState.currentState);

  // ── Load initial unread counts from API ─────────────────────────────────
  const loadInitialUnreadCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const token = await getToken();
      if (!token) return;

      // User: Unread messages count
      const messagesRes = await fetch(`${API_BASE_URL}/messages/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const messagesData = await messagesRes.json();
      if (messagesData.success) {
        setUnreadMessages(messagesData.count || 0);
      }

      // User: Unread matches count
      const matchesRes = await fetch(`${API_BASE_URL}/matches/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const matchesData = await matchesRes.json();
      if (matchesData.success) {
        setUnreadMatches(matchesData.count || 0);
      }

      // Admin: Pending counts
      if (isAdmin) {
        // Pending lost items
        const lostRes = await fetch(`${API_BASE_URL}/admin/lost-items/pending-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const lostData = await lostRes.json();
        if (lostData.success) {
          setPendingLostCount(lostData.count || 0);
          setUnreadLost(lostData.count || 0);
        }

        // Pending found items
        const foundRes = await fetch(`${API_BASE_URL}/admin/found-items/pending-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const foundData = await foundRes.json();
        if (foundData.success) {
          setPendingFoundCount(foundData.count || 0);
          setUnreadFound(foundData.count || 0);
        }

        // Pending matches
        const pendingMatchesRes = await fetch(`${API_BASE_URL}/admin/matches/pending-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const pendingMatchesData = await pendingMatchesRes.json();
        if (pendingMatchesData.success) {
          setPendingMatchesCount(pendingMatchesData.count || 0);
          setUnreadAdminMatches(pendingMatchesData.count || 0);
        }

        // New users (last 7 days)
        const usersRes = await fetch(`${API_BASE_URL}/admin/users/new-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const usersData = await usersRes.json();
        if (usersData.success) {
          setPendingUsersCount(usersData.count || 0);
          setUnreadAdminUsers(usersData.count || 0);
        }
      }
    } catch (error) {
      console.error('Error loading initial unread counts:', error);
    }
  }, [user?.id, isAdmin]);

  // ── Connect / disconnect when auth changes ─────────────────────────────────

  useEffect(() => {
    if (!user?.id) {
      cleanup();
      return;
    }

    // Load initial counts
    loadInitialUnreadCounts();

    let removeConnectionListener;

    const init = async () => {
      removeConnectionListener = wsService.onConnectionChange((status) => {
        setConnected(status);
        if (!status) setUseFallback(true);
      });

      const ok = await wsService.connect();

      if (ok) {
        setConnected(true);
        setUseFallback(false);
        subscribeUserChannel(user.id);
      } else {
        setUseFallback(true);
        startNotificationPolling();
      }
    };

    init();

    return () => {
      removeConnectionListener?.();
      cleanup();
    };
  }, [user?.id, isAdmin, loadInitialUnreadCounts]);

  // ── Reconnect when app comes to foreground ─────────────────────────────────

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        if (user?.id && !wsService.isConnected) {
          const ok = await wsService.connect();
          if (ok) {
            setUseFallback(false);
            subscribeUserChannel(user.id);
            stopNotificationPolling();
          }
        }
        // Refresh counts when app comes to foreground
        if (user?.id) {
          loadInitialUnreadCounts();
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [user?.id, loadInitialUnreadCounts]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const cleanup = () => {
    userChannelUnsubRef.current?.();
    userChannelUnsubRef.current = null;
    stopNotificationPolling();
    wsService.disconnect();
    setConnected(false);
  };

  const subscribeUserChannel = (userId) => {
    userChannelUnsubRef.current?.();
    userChannelUnsubRef.current = wsService.subscribeToUserChannel(userId, {
      onNotification: (data) => {
        notifyListeners(data);
        
        if (data.type === 'lost') {
          if (isAdmin) {
            setPendingLostCount(c => c + 1);
            setUnreadLost(c => c + 1);
          }
        } else if (data.type === 'found') {
          if (isAdmin) {
            setPendingFoundCount(c => c + 1);
            setUnreadFound(c => c + 1);
          }
        }
        
        setUnreadNotifications(c => c + 1);
        
        scheduleLocalNotification(
          data.title || 'New Notification',
          data.body || data.message || 'You have a new notification',
          data
        );
      },
      
      onMatch: (data) => {
        notifyListeners({ ...data, type: 'match' });
        
        if (isAdmin) {
          setPendingMatchesCount(c => c + 1);
          setUnreadAdminMatches(c => c + 1);
        } else {
          setUnreadMatches(c => c + 1);
        }
        
        setUnreadNotifications(c => c + 1);
        
        scheduleLocalNotification(
          '🔍 New Match Found!',
          data.message || `A match was found for "${data.item_name || 'your item'}"`,
          { type: 'match', ...data }
        );
      },
      
      onMessageNotification: (data) => {
        notifyListeners({ ...data, type: 'message' });
        setUnreadMessages(c => c + 1);
        setUnreadNotifications(c => c + 1);
        
        scheduleLocalNotification(
          `💬 New message from ${data.sender_name || 'Someone'}`,
          data.content || 'You have a new message',
          { type: 'message', ...data }
        );
      },
      
      onNewUserRegistered: (data) => {
        if (isAdmin) {
          setPendingUsersCount(c => c + 1);
          setUnreadAdminUsers(c => c + 1);
          setUnreadNotifications(c => c + 1);
          
          scheduleLocalNotification(
            '👤 New User Registered',
            `${data.name || 'A new user'} has joined Foundify!`,
            { type: 'user', ...data }
          );
        }
      },
      
      onItemApproved: (data) => {
        if (data.user_id === userId) {
          setUnreadNotifications(c => c + 1);
          scheduleLocalNotification(
            '✅ Item Approved',
            `Your item "${data.item_name}" has been approved!`,
            { type: 'approval', ...data }
          );
        }
      },
      
      onItemRejected: (data) => {
        if (data.user_id === userId) {
          setUnreadNotifications(c => c + 1);
          scheduleLocalNotification(
            '❌ Item Rejected',
            `Your item "${data.item_name}" was rejected. Reason: ${data.reason || 'Please contact support'}`,
            { type: 'rejection', ...data }
          );
        }
      },
    });
  };

  const notifyListeners = (data) => {
    notificationListeners.current.forEach(l => l(data));
  };

  // ── Notification polling fallback ──────────────────────────────────────────

  const startNotificationPolling = () => {
    if (notifPollRef.current) return;
    notifPollRef.current = setInterval(async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/notifications/recent`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          (data.notifications || []).forEach(n => notifyListeners(n));
        }
      } catch {}
    }, 10000);
  };

  const stopNotificationPolling = () => {
    if (notifPollRef.current) {
      clearInterval(notifPollRef.current);
      notifPollRef.current = null;
    }
  };

  // ── Public API ─────────────────────────────────────────────────────────────

  const subscribeToConversation = useCallback((conversationId, callbacks) => {
    if (wsService.isConnected) {
      const unsub = wsService.subscribeToConversation(conversationId, callbacks);
      if (unsub) return { unsubscribe: unsub, setLastMessageId: () => {} };
    }

    let lastMessageId = 0;
    const interval = setInterval(async () => {
      if (lastMessageId === 0) return;
      try {
        const token = await getToken();
        const res = await fetch(
          `${API_BASE_URL}/messages/${conversationId}/poll?last_id=${lastMessageId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const msgs = data.messages || (Array.isArray(data) ? data : []);
          msgs.forEach(msg => {
            if (msg.id > lastMessageId) {
              callbacks.onNewMessage?.({ message: msg });
              lastMessageId = msg.id;
            }
          });
        }
      } catch {}
    }, 3000);

    return {
      unsubscribe: () => clearInterval(interval),
      setLastMessageId: (id) => { lastMessageId = id; },
    };
  }, []);

  const addNotificationListener = useCallback((listener) => {
    notificationListeners.current.push(listener);
    return () => {
      notificationListeners.current = notificationListeners.current.filter(l => l !== listener);
    };
  }, []);

  // Clear functions
  const clearUnreadMessages = useCallback(() => setUnreadMessages(0), []);
  const clearUnreadMatches = useCallback(() => setUnreadMatches(0), []);
  const clearUnreadLost = useCallback(() => setUnreadLost(0), []);
  const clearUnreadFound = useCallback(() => setUnreadFound(0), []);
  const clearUnreadNotifications = useCallback(() => setUnreadNotifications(0), []);
  const clearUnreadAdminMatches = useCallback(() => setUnreadAdminMatches(0), []);
  const clearUnreadAdminUsers = useCallback(() => setUnreadAdminUsers(0), []);
  const clearPendingLost = useCallback(() => setPendingLostCount(0), []);
  const clearPendingFound = useCallback(() => setPendingFoundCount(0), []);
  const clearPendingMatches = useCallback(() => setPendingMatchesCount(0), []);
  const clearPendingUsers = useCallback(() => setPendingUsersCount(0), []);

  return (
    <SocketContext.Provider value={{
      connected,
      useFallback,
      // User unread counts
      unreadMessages,
      unreadMatches,
      unreadLost,
      unreadFound,
      unreadNotifications,
      // Admin unread counts
      unreadAdminMatches,
      unreadAdminUsers,
      // Pending counts for badges
      pendingLostCount,
      pendingFoundCount,
      pendingMatchesCount,
      pendingUsersCount,
      totalPendingItems: pendingLostCount + pendingFoundCount,
      totalPendingMatches: pendingMatchesCount,
      totalPendingUsers: pendingUsersCount,
      // Clear functions
      clearUnreadMessages,
      clearUnreadMatches,
      clearUnreadLost,
      clearUnreadFound,
      clearUnreadNotifications,
      clearUnreadAdminMatches,
      clearUnreadAdminUsers,
      clearPendingLost,
      clearPendingFound,
      clearPendingMatches,
      clearPendingUsers,
      // Utility functions
      subscribeToConversation,
      addNotificationListener,
    }}>
      {children}
    </SocketContext.Provider>
  );
};