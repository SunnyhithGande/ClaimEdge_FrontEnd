import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ComplianceReport {
  reportId?: number;
  reportType: string;
  scope: string;
  generatedDate: string;
  status: 'GENERATED' | 'APPROVED' | 'REJECTED';
}

@Injectable({
  providedIn: 'root'
})
export class ComplianceService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/compliance`;

  getAllReports(): Observable<ComplianceReport[]> {
    return this.http.get<ComplianceReport[]>(this.apiUrl);
  }

  generateReport(): Observable<ComplianceReport> {
    return this.http.post<ComplianceReport>(`${this.apiUrl}/generate`, {});
  }

  approveReport(id: number, approvedBy: string): Observable<ComplianceReport> {
    return this.http.put<ComplianceReport>(`${this.apiUrl}/${id}/approve`, { approvedBy });
  }

  rejectReport(id: number, reason: string): Observable<ComplianceReport> {
    return this.http.put<ComplianceReport>(`${this.apiUrl}/${id}/reject`, { reason });
  }

  getComplianceSummary(): Observable<any> {
    return this.http.get(`${this.apiUrl}/report`);
  }
}
