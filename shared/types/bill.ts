import type { PermissionRole } from './auth';

export const proposalTypes = ['discussion', 'report', 'election'] as const;
export type ProposalType = (typeof proposalTypes)[number];

export const proposalTypeLabels: Record<ProposalType, string> = {
  discussion: '討論案',
  report: '報告案',
  election: '選舉案',
};

export function isProposalType(value: unknown): value is ProposalType {
  return typeof value === 'string' && proposalTypes.includes(value as ProposalType);
}

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
  meetingTypeName: string;
  session: number;
  meetingDate: string;
  proposalDeadlineAt: string;
  title: string;
  location: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduledMeeting extends Meeting {
  proposalCount: number;
}

export interface AgendaEntry {
  kind: 'heading' | 'text' | 'proposal';
  content: string;
  proposalId: number | null;
}

export interface ProposalMeeting {
  id: number;
  title: string;
  meetingDate: string;
  proposalDeadlineAt: string;
  location: string;
}

export interface ProposalAttachment {
  id?: number;
  proposalId?: number;
  name: string;
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
  proposalType: ProposalType;
  committeeId: number | null;
  committeeName: string;
  session: number;
  proposedAt: string;
  proposerId: number;
  proposerName: string;
  proposerEmail: string;
  meetings: ProposalMeeting[];
  subject: string;
  description: string;
  attachments: ProposalAttachment[];
  cosponsors: ProposalCosponsor[];
  createdAt: string;
  updatedAt: string;
}

export interface ProposalInput {
  proposalType?: ProposalType;
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
