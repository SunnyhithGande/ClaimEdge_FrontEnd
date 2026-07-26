import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class IdentityService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`);
  }

  updateUserStatus(id: number, status: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}/status?status=${status}`, {});
  }

  updateUserRole(id: number, role: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}/role?role=${role}`, {});
  }
}
