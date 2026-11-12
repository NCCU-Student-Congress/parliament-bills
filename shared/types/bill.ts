import type { PermissionRole } from './auth';

export interface Committee {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  permissionRole: PermissionRole;
  committeeIds: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  id: number;
  title: string;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Meeting {
  id: number;
  committeeId: number | null;
  committeeName?: string;
  session: number;
  meetingDate: string;
  proposalDeadlineAt: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProposalAttachment {
  id?: number;
  proposalId?: number;
  name: string | null;
  url: string;
  createdAt?: string;
}

export interface ProposalAttachmentInput {
  name: string;
  url: string;
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
  committeeId: number | null;
  committeeName: string;
  session: number;
  proposedAt: string;
  proposerId: number;
  proposerName: string;
  proposerEmail: string;
  meetingId: number | null;
  meetingTitle: string | null;
  meetingDate: string | null;
  proposalDeadlineAt: string | null;
  subject: string;
  description: string;
  attachments: ProposalAttachment[];
  cosponsors: ProposalCosponsor[];
  createdAt: string;
  updatedAt: string;
}

export interface ProposalInput {
  committeeId: number | null;
  session: number;
  proposedAt?: string;
  proposerId: number;
  subject: string;
  description?: string;
  attachments?: ProposalAttachmentInput[];
}

export type ProposalEditableField =
  'session' | 'committeeId' | 'proposedAt' | 'subject' | 'description' | 'attachments';

export type Bill = Proposal;

export interface BillApiResponse {
  bills: Bill[];
}
