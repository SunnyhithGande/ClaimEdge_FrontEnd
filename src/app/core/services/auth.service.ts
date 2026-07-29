import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
 
export interface User {
 
  userId?: number;
 
  name: string;
 
  role:
    | 'POLICYHOLDER'
    | 'UNDERWRITER'
    | 'ADJUSTER'
    | 'OPERATIONS'
    | 'COMPLIANCE'
    | 'POLICY_ADMIN'
    | 'ADMIN'
    | string;
 
  email: string;
 
  phone?: string;
 
  status?: string;
 
  password?: string;
 
}
 
export interface LoginRequest {
 
  email: string;
 
  password: string;
 
}
 
@Injectable({
  providedIn: 'root'
})
export class AuthService {
 
  private http = inject(HttpClient);
 
  private apiUrl = environment.apiUrl;
 
  private readonly TOKEN_KEY = 'claimedge_token';
 
  private readonly USER_KEY = 'claimedge_user';
 
  register(user: User): Observable<User> {
 
    return this.http.post<User>(
      `${this.apiUrl}/auth/register`,
      user
    );
 
  }
 
  login(credentials: LoginRequest): Observable<string> {
 
    return this.http.post(
      `${this.apiUrl}/auth/login`,
      credentials,
      {
        responseType: 'text'
      }
    ).pipe(
 
      tap((token: string) => {
 
        this.saveToken(token);
 
      })
 
    );
 
  }
 
  saveToken(token: string): void {
 
    localStorage.setItem(
      this.TOKEN_KEY,
      token
    );
 
  }
 
  getToken(): string | null {
 
    return localStorage.getItem(
      this.TOKEN_KEY
    );
 
  }
 
  setUser(user: User): void {
 
    localStorage.setItem(
      this.USER_KEY,
      JSON.stringify(user)
    );
 
  }
 
  getUser(): User | null {
 
    const user = localStorage.getItem(
      this.USER_KEY
    );
 
    return user
      ? JSON.parse(user)
      : null;
 
  }
 
  getCurrentUserFromApi(): Observable<User> {
 
    return this.http.get<User>(
      `${this.apiUrl}/users/me`
    ).pipe(
 
      tap((user: User) => {
 
        this.setUser(user);
 
      })
 
    );
 
  }
 
  getCurrentUserId(): number {
 
    const user = this.getUser();
 
    return user?.userId || 0;
 
  }
 
  getRole(): string {
 
    const user = this.getUser();
 
    return user?.role
      ? user.role.toUpperCase()
      : 'GUEST';
 
  }
 
  hasRole(...allowedRoles: string[]): boolean {
 
    const role = this.getRole();
 
    if (role === 'ADMIN') {
 
      return true;
 
    }
 
    return allowedRoles.includes(role);
 
  }
 
  isLoggedIn(): boolean {
 
    const token = this.getToken();
 
    if (!token) {
 
      return false;
 
    }
 
    try {
 
      const payloadBase64 =
        token.split('.')[1];
 
      const payload =
        JSON.parse(atob(payloadBase64));
 
      if (
        payload.exp &&
        Date.now() >= payload.exp * 1000
      ) {
 
        this.logout();
 
        return false;
 
      }
 
      return true;
 
    } catch {
 
      return false;
 
    }
 
  }
 
  logout(): void {
 
    localStorage.removeItem(
      this.TOKEN_KEY
    );
 
    localStorage.removeItem(
      this.USER_KEY
    );
 
  }
 
}