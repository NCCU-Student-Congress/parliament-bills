export type AttachmentKind = 'file' | 'link';

export interface Committee {
  id: number;
  name: string;
  code: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  permissionRole: string;
  committeeIds: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Meeting {
  id: number;
  committeeId: number;
  committeeName?: string;
  session: number;
  meetingDate: string;
  proposalDeadlineAt: string;
  title: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProposalAttachment {
  id?: number;
  proposalId?: number;
  kind: AttachmentKind;
  url: string;
  r2Key?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  createdAt?: string;
}

export interface ProposalCosponsor {
  id?: number;
  proposalId?: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  status: 'pending' | 'confirmed' | 'declined' | 'expired' | 'cancelled';
  invitedAt?: string | null;
  confirmedAt?: string | null;
  declinedAt?: string | null;
  tokenExpiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Proposal {
  id: number;
  committeeId: number;
  committeeName: string;
  session: number;
  proposedAt: string;
  proposerId: number;
  proposerName: string;
  proposerEmail: string;
  meetingId: number;
  meetingTitle: string;
  meetingDate: string;
  proposalDeadlineAt: string;
  subject: string;
  description: string;
  attachments: ProposalAttachment[];
  cosponsors: ProposalCosponsor[];
  createdAt: string;
  updatedAt: string;
}

export interface ProposalInput {
  committeeId: number;
  session: number;
  proposedAt?: string;
  proposerId: number;
  meetingId: number;
  subject: string;
  description?: string;
  attachments?: Array<string | Partial<ProposalAttachment>>;
  cosponsorIds?: number[];
}

export type Bill = Proposal;

export interface BillApiResponse {
  bills: Bill[];
}
