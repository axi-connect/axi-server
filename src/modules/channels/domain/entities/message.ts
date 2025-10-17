import { MessageDirection, MessageStatus } from '@prisma/client';

export interface MessageEntity {
  id: string;
  from?: string;
  to?: string;
  message: string;
  payload?: any;
  metadata?: any;
  direction: MessageDirection;
  timestamp: Date;
  conversation_id: string;
  status: MessageStatus;
  content_type: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMessageData {
  from?: string;
  to?: string;
  message: string;
  payload?: any;
  metadata?: any;
  direction: MessageDirection;
  conversation_id: string;
  content_type: string;
}

export interface UpdateMessageData {
  status?: MessageStatus;
  metadata?: any;
}
