import { MessageAttachmentEntity, CreateAttachmentData } from '@/modules/channels/domain/entities/attachment.js';

export interface CreateAttachmentInput {
  message_id: string;
  filename: string;
  mime_type: string;
  size: number;
  url?: string;
  local_path?: string;
}

export interface AttachmentUseCases {
  // This will be implemented when we add the attachment repository interface
  createAttachment(input: CreateAttachmentInput): Promise<MessageAttachmentEntity>;
  getAttachmentById(id: string): Promise<MessageAttachmentEntity>;
  getAttachmentsByMessage(message_id: string): Promise<MessageAttachmentEntity[]>;
  deleteAttachment(id: string): Promise<boolean>;
}
