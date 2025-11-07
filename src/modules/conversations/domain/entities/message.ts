import { MessageDirection, MessageStatus } from '@prisma/client';

export interface MessageEntity {
  id: string;
  from?: string;
  to?: string;
  payload?: any;
  metadata?: any;
  timestamp: Date;
  message: string;
  created_at: Date;
  updated_at: Date;
  content_type: string;
  status: MessageStatus;
  conversation_id: string;
  direction: MessageDirection;
}

export interface CreateMessageData {
  to: string;
  from: string;
  payload?: any;
  metadata?: any;
  message: string;
  content_type: string;
  status?: MessageStatus;
  conversation_id: string;
  direction: MessageDirection;
}

export interface MessageInput extends CreateMessageData {
  channel_id: string;
  provider_message_id: string;
}

// export interface MessagePayload {
//   to: string;
//   message: string;
//   type?: 'text' | 'template' | 'media';
//   media?: {
//     type: 'image' | 'video' | 'audio' | 'document';
//     url: string;
//     filename?: string;
//   };
//   template?: {
//     name: string;
//     language: string;
//     components: any[];
//   };
// }

export interface UpdateMessageData {
  status?: MessageStatus;
  metadata?: any;
}
