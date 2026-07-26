import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface FraudFlag {
  flagId?: number;
  claimId: number;
  fraudType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'INVESTIGATED' | 'CLEARED';
}

@Injectable({
  providedIn: 'root'
})
export class FraudService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/fraud`;

  getAllFlags(): Observable<FraudFlag[]> {
    return this.http.get<FraudFlag[]>(this.apiUrl);
  }

  addFlag(flag: FraudFlag): Observable<FraudFlag> {
    return this.http.post<FraudFlag>(this.apiUrl, flag);
  }

  investigateFlag(id: number, reviewedBy: string, notes: string): Observable<FraudFlag> {
    return this.http.put<FraudFlag>(`${this.apiUrl}/${id}/investigate`, { reviewedBy, notes });
  }

  clearFlag(id: number, clearedBy: string): Observable<FraudFlag> {
    return this.http.put<FraudFlag>(`${this.apiUrl}/${id}/clear`, { clearedBy });
  }

  getFraudReport(): Observable<any> {
    return this.http.get(`${this.apiUrl}/report`);
  }
}
