/** Message status used for read receipts. */
export type MessageStatus = 'sent' | 'delivered' | 'read';

/** A single chat message. */
export interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  /** Pre-parsed & sanitized HTML for the client (emojis already shortname→unicode). */
  html: string;
  status: MessageStatus;
  createdAt: string;
  /** Set if this is a system message (join/leave/clear). */
  systemEvent?: 'joined' | 'left' | 'cleared' | 'migrated' | null;
}

/** Public-safe message shape with the author attached. */
export interface MessageWithAuthor extends Message {
  author: {
    id: string;
    displayName: string;
    avatarColor: string;
  };
}

export interface SendMessageDto {
  roomId: string;
  content: string;
  /** Client-side temp id so the client can correlate ack with optimistic message. */
  clientMessageId?: string;
}

export interface MessageAckDto {
  clientMessageId?: string;
  message: MessageWithAuthor;
}

export interface MessageReadDto {
  roomId: string;
  messageIds: string[];
}
