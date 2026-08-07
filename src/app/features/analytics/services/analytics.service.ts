import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface InsuranceReport {
  reportId?: number;
  reportName?: string;
  scope?: string;
  reportType?: string;
  product?: string;
  region?: string;
  timePeriod?: string;
  generatedDate?: string;
  generatedBy?: string;
  status?: string;
  totalPolicies?: number;
  totalClaims?: number;
  approvedClaims?: number;
  rejectedClaims?: number;
  totalClaimAmount?: number;
  totalPremiumCollected?: number;
  totalDisbursementAmount?: number;
  lossRatio?: number;
  slaPercentage?: number;
  avgSettlementTime?: number;
  metrics?: string;
  topRegion?: string;
  highestProduct?: string;
  notes?: string;
}

export interface ReportGenerationRequest {
  reportScope: string;
  reportType: string;
  product: string;
  region: string;
  timePeriod: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reports`;

  getAllReports(): Observable<InsuranceReport[]> {
    return this.http.get<InsuranceReport[]>(this.apiUrl);
  }

  generateReport(payload?: ReportGenerationRequest): Observable<InsuranceReport> {
    return this.http.post<InsuranceReport>(`${this.apiUrl}/generate`, payload || {});
  }



  deleteReport(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
