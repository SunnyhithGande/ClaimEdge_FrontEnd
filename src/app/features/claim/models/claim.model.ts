export interface Claim {
  claimId: number;
  policyId: number;
  claimType: string;
  incidentDate: string;
  submissionDate: string;
  claimAmount: number;
  assignedAdjusterId: number;
  status: string;
}