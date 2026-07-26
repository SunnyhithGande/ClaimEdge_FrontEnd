import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Endorsement {
  endorsementId?: number;
  policy: {
    policyId: number;
  };
  changeType: string;
  effectiveDate: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class EndorsementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/endorsements`;

  getAllEndorsements(): Observable<Endorsement[]> {
    return this.http.get<Endorsement[]>(this.apiUrl);
  }

  getEndorsementsByPolicy(policyId: number): Observable<Endorsement[]> {
    return this.http.get<Endorsement[]>(`${this.apiUrl}/policy/${policyId}`);
  }

  createEndorsement(endorsement: any): Observable<Endorsement> {
    return this.http.post<Endorsement>(this.apiUrl, endorsement);
  }

  updateEndorsement(id: number, endorsement: any): Observable<Endorsement> {
    return this.http.put<Endorsement>(`${this.apiUrl}/${id}`, endorsement);
  }

  deleteEndorsement(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
