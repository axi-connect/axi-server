export interface MessageAttachmentEntity {
  id: string;
  message_id: string;
  filename: string;
  mime_type: string;
  size: number;
  url?: string;
  local_path?: string;
  created_at: Date;
}

export interface CreateAttachmentData {
  message_id: string;
  filename: string;
  mime_type: string;
  size: number;
  url?: string;
  local_path?: string;
}
