export interface InsuranceReport {
  reportId: number;
  scope: string;
  claimCount: number;
  lossRatio: number;
  avgSettlementTime: number;
  premiumCollected: number;
  generatedDate: string;
}