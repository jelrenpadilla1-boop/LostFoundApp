/**
 * src/services/websocketService.js
 *
 * WebSocket service using Pusher-compatible protocol.
 *
 * Works with any Laravel broadcasting driver:
 *   - Laravel Reverb        (default port 8080)
 *   - Laravel WebSockets    (default port 6001)
 *   - Pusher cloud          (set USE_PUSHER_CLOUD = true)
 *
 * Required Laravel backend setup:
 *   1. BROADCAST_DRIVER=reverb (or pusher) in .env
 *   2. php artisan reverb:start  (or laravel-websockets serve)
 *   3. Events to broadcast:
 *        MessageSent             → private-conversation.{id}
 *        NewMatch                → private-App.User.{userId}
 *        NewMessageNotification  → private-App.User.{userId}
 *      OR use Laravel Notifications with broadcastOn().
 */

import Pusher from 'pusher-js/react-native';
import { getToken } from '../utils/tokenStorage';

// ─── Configuration ────────────────────────────────────────────────────────────
const API_HOST = '192.168.1.2';
const API_PORT = 8092;
const WS_PORT  = 8080;   // Laravel Reverb default port (change to match REVERB_PORT in .env)


export const WS_CONFIG = {
  appKey:  '9d07def6364aafd87b17',   // must match REVERB_APP_KEY in backend .env

  // Point directly at the Reverb WebSocket server (NOT Pusher cloud)
  wsHost:  API_HOST,
  wsPort:  WS_PORT,
  forceTLS: false,
  enabledTransports: ['ws'],
  cluster: 'mt1', // required by pusher-js but ignored when wsHost is set

  // Laravel broadcasting auth endpoint
  authEndpoint: `http://${API_HOST}:${API_PORT}/api/broadcasting/auth`,

  disableStats: true,
  activityTimeout: 120000,
  pongTimeout: 30000,
};
// ─────────────────────────────────────────────────────────────────────────────

class WebSocketService {
  constructor() {
    this.pusher = null;
    this.channels = new Map();
    this.isConnected = false;
    this._connecting = false;
    this._connectionListeners = new Set();
  }

  // ── Connection ──────────────────────────────────────────────────────────────

  onConnectionChange(listener) {
    this._connectionListeners.add(listener);
    return () => this._connectionListeners.delete(listener);
  }

  _notifyConnectionChange(status) {
    this._connectionListeners.forEach(l => l(status));
  }

  async connect() {
    if (this.pusher) return this.isConnected;
    if (this._connecting) return false;
    this._connecting = true;

    const token = await getToken();
    if (!token) {
      console.log('WS: no auth token, skipping');
      this._connecting = false;
      return false;
    }

    return new Promise((resolve) => {
      try {
        const options = {
          auth: {
            endpoint: WS_CONFIG.authEndpoint,
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          },
          channelAuthorization: {
            endpoint: WS_CONFIG.authEndpoint,
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          },
          disableStats: WS_CONFIG.disableStats,
          activityTimeout: WS_CONFIG.activityTimeout,
          pongTimeout: WS_CONFIG.pongTimeout,
        };

        options.wsHost            = WS_CONFIG.wsHost;
        options.wsPort            = WS_CONFIG.wsPort;
        options.forceTLS          = WS_CONFIG.forceTLS;
        options.enabledTransports = WS_CONFIG.enabledTransports;
        options.cluster           = WS_CONFIG.cluster;

        this.pusher = new Pusher(WS_CONFIG.appKey, options);

        const done = (result) => {
          this._connecting = false;
          resolve(result);
        };

        const timeout = setTimeout(() => {
          console.log('WS: connection timeout, falling back to polling');
          done(false);
        }, 10000);

        this.pusher.connection.bind('connected', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this._notifyConnectionChange(true);
          console.log('✅ WebSocket connected');
          done(true);
        });

        this.pusher.connection.bind('failed', () => {
          clearTimeout(timeout);
          this.isConnected = false;
          this._notifyConnectionChange(false);
          console.log('❌ WebSocket connection failed, falling back to polling');
          done(false);
        });

        this.pusher.connection.bind('disconnected', () => {
          this.isConnected = false;
          this._notifyConnectionChange(false);
          console.log('🔌 WebSocket disconnected');
        });

        this.pusher.connection.bind('error', (err) => {
          console.log('⚠️ WebSocket error code:', err?.error?.data?.code);
        });
      } catch (error) {
        console.error('WS: init failed:', error);
        this.pusher = null;
        this._connecting = false;
        resolve(false);
      }
    });
  }

  disconnect() {
    if (!this.pusher) return;
    this.channels.forEach((_, name) => this.pusher.unsubscribe(name));
    this.channels.clear();
    this.pusher.disconnect();
    this.pusher = null;
    this.isConnected = false;
  }

  // ── Channel helpers ─────────────────────────────────────────────────────────

  _subscribe(channelName) {
    if (!this.pusher) return null;
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, this.pusher.subscribe(channelName));
    }
    return this.channels.get(channelName);
  }

  _unsubscribe(channelName) {
    if (this.channels.has(channelName)) {
      this.pusher?.unsubscribe(channelName);
      this.channels.delete(channelName);
    }
  }

  // ── Public subscriptions ────────────────────────────────────────────────────

  /**
   * Subscribe to real-time messages in a conversation.
   *
   * Laravel: broadcast MessageSent event on private-conversation.{id}
   * Payload: { message: { id, content, user_id, created_at, ... } }
   *
   * Returns an unsubscribe function, or null if not connected.
   */
  subscribeToConversation(conversationId, callbacks) {
    const channelName = `private-conversation.${conversationId}`;
    const channel = this._subscribe(channelName);
    if (!channel) return null;

    const onMessage = (data) => callbacks.onNewMessage?.(data);
    const onTyping  = (data) => callbacks.onTyping?.(data);
    const messageEvents = [
      'MessageSent',
      '.MessageSent',
      'App\\Events\\MessageSent',
      'App\\Events\\Messages\\MessageSent',
    ];
    const typingEvents = [
      'UserTyping',
      '.UserTyping',
      'App\\Events\\UserTyping',
    ];

    messageEvents.forEach(event => channel.bind(event, onMessage));
    typingEvents.forEach(event => channel.bind(event, onTyping));

    return () => {
      messageEvents.forEach(event => channel.unbind(event, onMessage));
      typingEvents.forEach(event => channel.unbind(event, onTyping));
      this._unsubscribe(channelName);
    };
  }

  /**
   * Subscribe to user-level notifications (matches, messages from other convos).
   *
   * Laravel: broadcast on private-App.User.{userId}
   *   - Illuminate\Notifications\Events\BroadcastNotificationCreated  (built-in)
   *   - NewMatch               { match_id, item_name, score, ... }
   *   - NewMessageNotification { conversation_id, sender_name, content, ... }
   *
   * Returns an unsubscribe function, or null if not connected.
   */
  subscribeToUserChannel(userId, callbacks) {
    const channelName = `private-App.User.${userId}`;
    const channel = this._subscribe(channelName);
    if (!channel) return null;

    const onNotification        = (data) => callbacks.onNotification?.(data);
    const onMatch               = (data) => callbacks.onMatch?.(data);
    const onMessageNotification = (data) => callbacks.onMessageNotification?.(data);
    const notificationEvents = [
      'Illuminate\\Notifications\\Events\\BroadcastNotificationCreated',
      '.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated',
    ];
    const matchEvents = [
      'NewMatch',
      '.NewMatch',
      'App\\Events\\NewMatch',
    ];
    const messageNotificationEvents = [
      'NewMessageNotification',
      '.NewMessageNotification',
      'App\\Events\\NewMessageNotification',
    ];

    notificationEvents.forEach(event => channel.bind(event, onNotification));
    matchEvents.forEach(event => channel.bind(event, onMatch));
    messageNotificationEvents.forEach(event => channel.bind(event, onMessageNotification));

    return () => {
      notificationEvents.forEach(event => channel.unbind(event, onNotification));
      matchEvents.forEach(event => channel.unbind(event, onMatch));
      messageNotificationEvents.forEach(event => channel.unbind(event, onMessageNotification));
      this._unsubscribe(channelName);
    };
  }
}

export default new WebSocketService();
