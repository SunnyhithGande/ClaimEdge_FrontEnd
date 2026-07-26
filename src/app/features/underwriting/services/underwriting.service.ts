import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface UnderwritingApplication {
  applicationId?: number;
  policyId: number;
  riskScore?: number;
  premiumRecommended?: number;
  underwriterId?: number;
  decision?: 'APPROVED' | 'DECLINED' | 'REFERRED' | 'PENDING';
  decisionDate?: string;
}

export interface RiskFactor {
  factorId?: number;
  applicationId: number;
  factorType: string;
  factorValue: string;
  weight: number;
}

@Injectable({
  providedIn: 'root'
})
export class UnderwritingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/underwriting`;

  getAllApplications(): Observable<UnderwritingApplication[]> {
    return this.http.get<UnderwritingApplication[]>(`${this.apiUrl}/applications`);
  }

  getApplication(id: number): Observable<UnderwritingApplication> {
    return this.http.get<UnderwritingApplication>(`${this.apiUrl}/applications/${id}`);
  }

  createApplication(app: UnderwritingApplication): Observable<UnderwritingApplication> {
    return this.http.post<UnderwritingApplication>(`${this.apiUrl}/applications`, app);
  }

  addRiskFactor(factor: RiskFactor): Observable<RiskFactor> {
    return this.http.post<RiskFactor>(`${this.apiUrl}/risk-factors`, factor);
  }

  getRiskFactors(applicationId: number): Observable<RiskFactor[]> {
    return this.http.get<RiskFactor[]>(`${this.apiUrl}/risk-factors/${applicationId}`);
  }

  evaluateRisk(id: number): Observable<UnderwritingApplication> {
    return this.http.post<UnderwritingApplication>(`${this.apiUrl}/applications/${id}/evaluate`, {});
  }
}
