import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Policy } from '../models/policy.model';

@Injectable({
  providedIn: 'root'
})
export class PolicyService {

  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/policies`;

  getAllPolicies(): Observable<Policy[]> {
    return this.http.get<Policy[]>(`${this.apiUrl}/getall`);
  }

  getPoliciesByUserId(userId: number): Observable<Policy[]> {
    return this.http.get<Policy[]>(`${this.apiUrl}/user/${userId}`);
  }

  getPolicy(id: number): Observable<Policy> {
    return this.http.get<Policy>(`${this.apiUrl}/get/${id}`);
  }



  createPolicy(policy: Policy): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, policy);
  }

  updatePolicy(id: number, policy: Policy): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, policy);
  }

  deletePolicy(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  activatePolicy(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/activate`, {});
  }

  cancelPolicy(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/cancel`, {});
  }

  renewPolicy(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/renew`, {});
  }
}