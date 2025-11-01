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
  from?: string;
  to?: string;
  payload?: any;
  metadata?: any;
  message: string;
  content_type: string;
  status?: MessageStatus;
  conversation_id: string;
  direction: MessageDirection;
}

export interface UpdateMessageData {
  status?: MessageStatus;
  metadata?: any;
}
