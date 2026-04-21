/**
 * Tipos del dominio GenMail
 * Entidades principales del SaaS
 */

// ==================== ENUMS ====================

export type LeadStage = 'NEW' | 'NURTURING' | 'QUALIFIED' | 'CONVERTED' | 'UNSUBSCRIBED';

export type SequenceMode = 'EVERGREEN' | 'NURTURING_INFINITE';

export type SequenceStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type EnrollmentStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type GeneratedEmailStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'SENT' | 'REJECTED';

export type KnowledgeSourceType = 'RSS' | 'URL' | 'DOCUMENT' | 'SAMPLE_EMAIL';

export type KnowledgeSourceStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';

export type AnalyticsEventType = 'SENT' | 'OPENED' | 'CLICKED' | 'REPLIED' | 'UNSUBSCRIBED' | 'BOUNCED';

// ==================== ENTITIES ====================

export interface Business {
  id: string;
  name: string;
  slug: string;
  sector: string;
  brandVoice: string;
  prohibitedClaims: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'MEMBER';
  createdAt: Date;
}

export interface Lead {
  id: string;
  email: string;
  name: string;
  phone?: string;
  stage: LeadStage;
  contextData?: Record<string, unknown>;
  intentScore?: number;
  lastEngagement?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sequence {
  id: string;
  name: string;
  mode: SequenceMode;
  status: SequenceStatus;
  goal: string;
  activeEnrollments: number;
  totalEnrollments: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplate {
  id: string;
  sequenceId: string;
  stepNumber: number;
  subject: string;
  copyFramework: string;
  goal: string;
}

export interface GeneratedEmail {
  id: string;
  leadId: string;
  leadName: string;
  subject: string;
  previewText: string;
  status: GeneratedEmailStatus;
  qualityScore: number;
  sentAt?: Date;
  createdAt: Date;
}

export interface KnowledgeSource {
  id: string;
  type: KnowledgeSourceType;
  name: string;
  url?: string;
  status: KnowledgeSourceStatus;
  content?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== ANALYTICS ====================

export interface DashboardMetrics {
  totalLeads: number;
  emailsSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  activeSequences: number;
  leadsThisMonth: number;
}

export interface SequenceAnalytics {
  sequenceId: string;
  sequenceName: string;
  totalSent: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  unsubscribeRate: number;
  bounceRate: number;
}

export interface RecentEmail {
  id: string;
  leadName: string;
  leadEmail: string;
  subject: string;
  status: GeneratedEmailStatus;
  qualityScore: number;
  sentAt?: Date;
}

// ==================== UI TYPES ====================

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (row: T) => import('react').ReactNode;
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

// ==================== FORM TYPES ====================

export interface CreateLeadInput {
  email: string;
  name: string;
  phone?: string;
  stage: LeadStage;
  contextData?: Record<string, unknown>;
}

export interface CreateSequenceInput {
  name: string;
  mode: SequenceMode;
  goal: string;
}

export interface CreateSourceInput {
  type: KnowledgeSourceType;
  name: string;
  url?: string;
  content?: string;
}

export interface UpdateBusinessInput {
  name?: string;
  sector?: string;
  brandVoice?: string;
  prohibitedClaims?: string[];
}
