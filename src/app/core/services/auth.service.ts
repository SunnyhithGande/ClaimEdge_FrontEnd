import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  userId?: number;
  name: string;
  role: 'POLICYHOLDER' | 'UNDERWRITER' | 'ADJUSTER' | 'OPERATIONS' | 'COMPLIANCE' | 'POLICY_ADMIN' | 'ADMIN' | string;
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
  private readonly REGISTERED_USERS_KEY = 'claimedge_registered_users_db_v1';

  register(user: User): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/auth/register`, user).pipe(
      tap((saved: User) => {
        if (saved) {
          this.addRegisteredUserToLocalStore(saved);
        }
      })
    );
  }

  getStableUserId(emailStr?: string): number {
    if (!emailStr) return 101;
    const email = emailStr.toLowerCase().trim();
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = (hash * 31 + email.charCodeAt(i)) % 10000;
    }
    return Math.abs(hash) + 1000;
  }

  addRegisteredUserToLocalStore(user: User): void {
    try {
      const stored = localStorage.getItem(this.REGISTERED_USERS_KEY);
      const list: User[] = stored ? JSON.parse(stored) : [];

      const newUser: User = {
        userId: user.userId || this.getStableUserId(user.email),
        name: user.name || this.getUserNameByEmail(user.email),
        email: user.email,
        phone: user.phone || '+1 555-0199',
        role: user.role || 'POLICYHOLDER',
        status: user.status || 'ACTIVE'
      };

      const existsIndex = list.findIndex(u => u.email?.toLowerCase().trim() === newUser.email?.toLowerCase().trim());
      if (existsIndex >= 0) {
        list[existsIndex] = { ...list[existsIndex], ...newUser };
      } else {
        list.push(newUser);
      }
      localStorage.setItem(this.REGISTERED_USERS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Error saving registered user:', e);
    }
  }

  getRegisteredUsersFromLocalStore(): User[] {
    try {
      const stored = localStorage.getItem(this.REGISTERED_USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  isEmailRegistered(emailStr: string): boolean {
    if (!emailStr) return false;
    const target = emailStr.toLowerCase().trim();
    const registeredList = this.getRegisteredUsersFromLocalStore();
    return registeredList.some(u => u.email?.toLowerCase().trim() === target);
  }

  getUserNameByEmail(emailStr?: string): string {
    if (!emailStr) return 'User';
    const email = emailStr.toLowerCase().trim();

    if (email.includes('policyadmin')) return 'Policy Administrator';
    if (email.includes('admin@')) return 'Insurance Admin';
    if (email.includes('ajai')) return 'Ajai Kumar';
    if (email.includes('adjuster1')) return 'Adjuster 1';
    if (email.includes('adjuster')) return 'Claims Adjuster';
    if (email.includes('compliance') || email.includes('compilance')) return 'Compliance Officer';
    if (email.includes('analyst')) return 'Op Analyst';
    if (email.includes('ahilan')) return 'Ahilan';
    if (email.includes('dharun')) return 'Dharun';
    if (email.includes('gsunnyhith') || email.includes('gsunnyhit')) return 'Sunnyhith Gande';
    if (email.includes('naad')) return 'Nandu';

    // Format readable name from email
    const prefix = email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  login(credentials: LoginRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials, { responseType: 'text' }).pipe(
      tap((token: string) => {
        this.saveToken(token);
        this.decodeAndSaveToken(token, credentials.email);
      })
    );
  }

  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUser(): User | null {
    const u = localStorage.getItem(this.USER_KEY);
    if (!u) return null;
    const parsed: User = JSON.parse(u);
    if (parsed && parsed.email) {
      parsed.name = this.getUserNameByEmail(parsed.email);
      if (!parsed.userId) parsed.userId = this.getStableUserId(parsed.email);
    }
    return parsed;
  }

  getCurrentUserId(): number {
    const u = this.getUser();
    if (u?.userId) return Number(u.userId);

    const token = this.getToken();
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        if (payload.userId) return Number(payload.userId);
      } catch {}
    }

    if (u?.email) return this.getStableUserId(u.email);
    return 101;
  }

  setUser(user: User): void {
    if (user && user.email) {
      user.name = this.getUserNameByEmail(user.email);
      if (!user.userId) user.userId = this.getStableUserId(user.email);
    }
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  setRole(role: string): void {
    const u = this.getUser() || { name: 'User', email: 'user@claimedge.com', role: role };
    u.role = role.toUpperCase();
    this.setUser(u);
  }

  getRole(): string {
    const u = this.getUser();
    return u?.role ? u.role.toUpperCase() : 'GUEST';
  }

  hasRole(...allowedRoles: string[]): boolean {
    const role = this.getRole();
    if (role === 'ADMIN') return true;
    return allowedRoles.includes(role);
  }

  getCurrentUserFromApi(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`).pipe(
      tap((user: User) => {
        if (user) {
          user.name = this.getUserNameByEmail(user.email);
          if (!user.userId) user.userId = this.getStableUserId(user.email);
          this.setUser(user);
        }
      })
    );
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payloadBase64 = token.split('.')[1];
      const decodedJson = atob(payloadBase64);
      const payload = JSON.parse(decodedJson);
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      return !!token;
    }
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  private decodeAndSaveToken(token: string, fallbackEmail: string): void {
    try {
      const payloadBase64 = token.split('.')[1];
      const decodedJson = atob(payloadBase64);
      const payload = JSON.parse(decodedJson);

      const email = payload.sub || fallbackEmail;
      const roleFromJwt = payload.role || payload.authorities || 'POLICYHOLDER';
      const userIdFromJwt = payload.userId || this.getStableUserId(email);

      const user: User = {
        userId: Number(userIdFromJwt),
        email: email,
        name: this.getUserNameByEmail(email),
        role: String(roleFromJwt).toUpperCase()
      };

      this.setUser(user);
    } catch (e) {
      console.warn('JWT Decode notice:', e);
      this.setUser({
        userId: this.getStableUserId(fallbackEmail),
        email: fallbackEmail,
        name: this.getUserNameByEmail(fallbackEmail),
        role: 'POLICYHOLDER'
      });
    }
  }
}