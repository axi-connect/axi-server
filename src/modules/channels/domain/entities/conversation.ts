import { ParticipantType } from '@prisma/client';

export interface ConversationEntity {
  id: string;
  status: string;
  company_id: number;
  channel_id: string;
  external_id: string;
  assigned_agent_id?: number;
  participant_id?: string;
  participant_meta?: any;
  participant_type: ParticipantType;
  created_at: Date;
  updated_at: Date;
  last_message_at?: Date;
}

export interface CreateConversationData {
  company_id: number;
  channel_id: string;
  external_id: string;
  participant_id?: string;
  participant_meta?: any;
  participant_type: ParticipantType;
}

export interface UpdateConversationData {
  status?: string;
  assigned_agent_id?: number;
  participant_meta?: any;
  last_message_at?: Date;
}
