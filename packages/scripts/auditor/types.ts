// Audit-specific types

export interface AuditRequest {
  id: number;
  contractAddress: string;
  chapterNumber: number;
  requestTime: number;
  processed: boolean;
}

export interface AuditResult {
  approved: boolean;
  reason: string;
  chapterNumber: number;
}

