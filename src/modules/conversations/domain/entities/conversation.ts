import { ParticipantType } from '@prisma/client';

export interface ConversationEntity {
  id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  company_id: number;
  channel_id: string;
  external_id: string;
  participant_meta?: any;
  last_message_at?: Date;
  participant_id?: string;
  assigned_agent_id?: number;
  participant_type: ParticipantType;
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

export type Conversation = {
  id: string
  status: string
  company_id: number
  channel_id: string
  external_id: string
  updated_at: string
  created_at: string
  participant: {
    id: string
    name: string
    avatar: string
    type: ParticipantType
    meta: Record<string, unknown> | null
  }
  last_message: {
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

const conversation1: Conversation = {
  id: "conv_a1b2c3d4",
  status: "open", // Podría ser 'open', 'closed', 'pending', etc.
  company_id: 101,
  channel_id: "chan_whatsapp_456",
  external_id: "wa_ext_7890",
  updated_at: "2025-10-30T10:00:00Z",
  created_at: "2025-10-29T15:30:00Z",
  participant: {
    id: "part_x9y8z7w6",
    name: "Juan Pérez",
    avatar: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1761806910/1e245de8-23d5-498f-8d60-f9fc77557d40.png",
    type: "lead",
    meta: {
      phone: "+573001234567",
      city: "Bogotá",
    },
  },
  last_message: {
    id: "msg_f5g4h3i2",
    message: "¿Cómo puedo ayudarte con tu pedido?",
    created_at: "2025-10-30T10:00:00Z",
  },
  assigned_agent: {
    id: "ag_j1k2l3m4",
    name: "Ana Gómez",
    // agente lumo
    avatar: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1761809718/01-character-lumo-_close-up_em4lkg.png",
  },
};

const conversation2: Conversation = {
  id: "conv_e5f6g7h8",
  status: "closed",
  company_id: 102,
  channel_id: "chan_webchat_111",
  external_id: "web_ext_2222",
  updated_at: "2025-10-28T14:45:00Z",
  created_at: "2025-10-28T14:00:00Z",
  participant: {
      meta: null,
      type: "lead",
      id: "part_n0p1q2r3",
      name: "María López",
      avatar: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1761852896/c0836563-8c9c-4982-880d-9fab6fc279f4.png",
  },
  last_message: {
      id: "msg_s9t8u7v6",
      created_at: "2025-10-28T14:45:00Z",
      message: "Gracias por la ayuda, problema resuelto.",
  },
  assigned_agent: {
    id: "ag_w4x3y2z1",
    name: "Carlos Ruiz",
    avatar: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1761854482/04-character-nova-_close-up_pcu8mc.png",
  },
};

const conversation3: Conversation = {
  id: "conv_m3n4o5p6",
  status: "open",
  company_id: 103,
  channel_id: "chan_whatsapp_456",
  external_id: "wa_ext_5555",
  updated_at: "2025-10-30T10:05:00Z",
  created_at: "2025-10-30T09:50:00Z",
  participant: {
    id: "part_q9r0s1t2",
    name: "Andrés Giraldo",
    avatar: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1761856211/0d6e5e4c-d792-4447-b0ca-f42c2a9aca73.png",
    type: "customer",
    meta: {
      account_tier: "premium",
    },
  },
  last_message: {
    id: "msg_u3v4w5x6",
    message: "Necesito cambiar mi dirección de envío.",
    created_at: "2025-10-30T10:05:00Z",
  },
  assigned_agent: {
    id: "ag_w4x3y2z1",
    name: "Carlos Ruiz",
    avatar: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1761855914/05-character-vex-_close-up_gy0xod.png"
  },
};

const conversation4: Conversation = {
  id: "conv_i9j0k1l2",
  status: "pending",
  company_id: 101,
  channel_id: "chan_messenger_333",
  external_id: "fb_ext_4444",
  updated_at: "2025-10-30T09:15:00Z",
  created_at: "2025-10-30T09:10:00Z",
  participant: {
    id: "part_a5b6c7d8",
    name: "Bot Automático",
    avatar: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1761854482/04-character-nova-_close-up_pcu8mc.png",
    type: "system",
    meta: {
      intent: "general_inquiry",
    },
  },
  last_message: {
    id: "msg_e9f0g1h2",
    message: "Su consulta ha sido escalada a un agente.",
    created_at: "2025-10-30T09:15:00Z",
  }
};

const conversations: Conversation[] = [
  conversation1,
  conversation2,
  conversation3,
  conversation4
];
