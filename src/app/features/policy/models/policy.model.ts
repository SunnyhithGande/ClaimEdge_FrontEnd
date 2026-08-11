export interface Policy {
  policyId?: number;
  policyHolderId: number;
  productType: string;
  coverageAmount: number;
  premium: number;
  startDate: string;
  endDate: string;
  status?: string;
  riskScore?: number;
  underwriterRemarks?: string;
  riskFactors?: { [key: string]: any };
  displayId?: number;
  isMasterPlan?: boolean;
}