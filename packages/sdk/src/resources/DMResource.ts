/**
 * DMResource -- API wrapper for direct messaging operations.
 *
 * Handles conversations, messages, read receipts, message locking/unlocking,
 * and DM prepayment. Paid methods (send, unlockMessage, prepay) use normal
 * post() calls -- the x402 loop in HeyLolClient handles payment transparently.
 *
 * Uses a local HttpClient interface (not HeyLolClient import) to prevent circular
 * imports. HeyLolClient satisfies this interface structurally via its typed methods.
 */

import type {
  Conversation,
  ConversationId,
  ConversationListResponse,
  Message,
  MessageId,
  MessageListResponse,
  MessageUnlockResponse,
  PaginationParams,
  PaymentResult,
  SendDMParams,
  MarkReadParams,
  PrepayDMParams,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Local HttpClient interface -- prevents circular imports with HeyLolClient
// ---------------------------------------------------------------------------

interface HttpClient {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  conversations: '/dm/conversations',
  conversationMessages: (id: ConversationId) => `/dm/conversations/${id}/messages`,
  conversationRead: (id: ConversationId) => `/dm/conversations/${id}/read`,
  conversation: (id: ConversationId) => `/dm/conversations/${id}`,
  message: (id: MessageId) => `/dm/messages/${id}`,
  messageUnlock: (id: MessageId) => `/dm/messages/${id}/unlock`,
  prepay: '/payments/dm',
} as const;

// ---------------------------------------------------------------------------
// Response type for send()
// ---------------------------------------------------------------------------

export interface SendDMResponse {
  conversation?: Conversation;
  message: Message;
}

// ---------------------------------------------------------------------------
// DMResource
// ---------------------------------------------------------------------------

export class DMResource {
  private readonly _client: HttpClient;

  constructor(client: HttpClient) {
    this._client = client;
  }

  /**
   * Send a direct message. Routes based on discriminated union params:
   * - If `conversationId` is present, sends to existing conversation (POST /dm/conversations/:id/messages)
   * - If `to` is present, creates/gets conversation with recipient (POST /dm/conversations)
   *
   * Paid via x402 transparently when recipient has a DM price set.
   */
  send(params: SendDMParams): Promise<SendDMResponse> {
    if ('conversationId' in params) {
      // Send to existing conversation
      const { conversationId, content, imageUrls, gifUrl, videoUrl, lockPrice } = params;
      return this._client.post<SendDMResponse>(
        ROUTES.conversationMessages(conversationId),
        {
          content,
          image_urls: imageUrls,
          gif_url: gifUrl,
          video_url: videoUrl,
          lock_price: lockPrice,
        },
      );
    }

    // Create/get conversation and send first message
    const { to, content, imageUrls, gifUrl, videoUrl, lockPrice } = params;
    return this._client.post<SendDMResponse>(ROUTES.conversations, {
      recipient_id: to,
      content,
      image_urls: imageUrls,
      gif_url: gifUrl,
      video_url: videoUrl,
      lock_price: lockPrice,
    });
  }

  /**
   * List conversations with cursor-based pagination.
   * Returns API-shaped response (not PaginatedList<T>).
   */
  conversations(params?: PaginationParams): Promise<ConversationListResponse> {
    return this._client.get<ConversationListResponse>(
      ROUTES.conversations,
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * List messages in a conversation with cursor-based pagination.
   * Returns API-shaped response (not PaginatedList<T>).
   */
  messages(conversationId: ConversationId, params?: PaginationParams): Promise<MessageListResponse> {
    return this._client.get<MessageListResponse>(
      ROUTES.conversationMessages(conversationId),
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Mark messages in a conversation as read up to a given message ID.
   */
  markRead(conversationId: ConversationId, params: MarkReadParams): Promise<{ success: boolean }> {
    return this._client.post<{ success: boolean }>(
      ROUTES.conversationRead(conversationId),
      { last_read_message_id: params.lastReadMessageId },
    );
  }

  /**
   * Delete a conversation.
   */
  deleteConversation(conversationId: ConversationId): Promise<{ success: boolean }> {
    return this._client.delete<{ success: boolean }>(ROUTES.conversation(conversationId));
  }

  /**
   * Delete a message.
   */
  deleteMessage(messageId: MessageId): Promise<{ success: boolean }> {
    return this._client.delete<{ success: boolean }>(ROUTES.message(messageId));
  }

  /**
   * Unlock a locked message. Paid via x402 transparently.
   */
  unlockMessage(messageId: MessageId): Promise<MessageUnlockResponse> {
    return this._client.post<MessageUnlockResponse>(ROUTES.messageUnlock(messageId));
  }

  /**
   * Prepay for a DM to a user. Paid via x402 transparently.
   */
  prepay(params: PrepayDMParams): Promise<PaymentResult> {
    return this._client.post<PaymentResult>(ROUTES.prepay, {
      to_user_id: params.toUserId,
    });
  }
}
