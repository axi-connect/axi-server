import { ContactType } from '@prisma/client';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { WorkflowState } from '../../application/services/workflow-engine.service.js';
import { MessageInput } from './message.js';

export interface Contact {
  id: string;
  name: string;
  number: string;
  company_id: number;
  type: ContactType;
  profile_pic_url: string;
  meta: Record<string, unknown> | null;
}

export interface ConversationDto {
  id: string
  status: string
  contact: Contact
  company_id: number
  channel_id: string
  updated_at: string
  created_at: string
  external_id: string
  last_message?: {
    id: string
    message: string
    created_at: string
  }
  assigned_agent?: {
    id: string
    name: string
    avatar: string
  }
}

export interface ConversationEntity {
  id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  company_id: number;
  channel_id: string;
  contact_meta?: any;
  external_id: string;
  contact_id?: string;
  intention_id?: number;
  last_message_at?: Date;
  contact_type: ContactType;
  assigned_agent_id?: number;
  workflow_state?: WorkflowState;
}

export interface CreateConversationData {
  company_id: number;
  channel_id: string;
  external_id: string;
  contact_id?: string;
  intention_id?: number;
  contact_type: ContactType;
  assigned_agent_id?: number;
  contact_meta?: InputJsonValue | undefined;
  workflow_state?: InputJsonValue | undefined;
}

export interface UpdateConversationData {
  status?: string;
  assigned_agent_id?: number;
  contact_meta?: any;
  last_message_at?: Date;
  intention_id?: number;
  workflow_state?: InputJsonValue | undefined;
}

export type MessageHandlerData<T> = {
  message: T;
  contact: Contact;
  conversation?: ConversationEntity;
};