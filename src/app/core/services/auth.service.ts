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
        this.addRegisteredUserToLocalStore(saved || user);
      })
    );
  }

  private getEmailHashId(emailStr: string): number {
    let hash = 0;
    const str = emailStr.toLowerCase().trim();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash % 90000) + 100;
  }

  addRegisteredUserToLocalStore(user: User): void {
    try {
      const stored = localStorage.getItem(this.REGISTERED_USERS_KEY);
      const list: User[] = stored ? JSON.parse(stored) : [];

      const dbId = this.getDatabaseUserIdByEmail(user.email);
      const derivedId = dbId !== null ? dbId : this.getEmailHashId(user.email);

      const newUser: User = {
        userId: user.userId || derivedId,
        name: user.name,
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
      console.warn('Error saving registered user to local store:', e);
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

    const knownDbEmails = [
      'gsunnyhith@gmail.com',
      'gsunnyhit@gmail.com',
      'adjuster@claimedge.com',
      'admin@claimedge.com',
      'adjuster1@claimedge.com',
      'compliance@gmail.com',
      'compilance@gmail.com',
      'analyst@gmail.com',
      'ajai@gmail.com',
      'ahilan@gmail.com',
      'dharun@gmail.com',
      'naad@gmail.com'
    ];

    if (knownDbEmails.some(e => target.includes(e) || e.includes(target))) {
      return true;
    }

    if (this.getDatabaseUserIdByEmail(target) !== null) {
      return true;
    }

    const registeredList = this.getRegisteredUsersFromLocalStore();
    return registeredList.some(u => u.email?.toLowerCase().trim() === target);
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
    return u ? JSON.parse(u) : null;
  }

  getDatabaseUserIdByEmail(emailStr?: string): number | null {
    if (!emailStr) return null;
    const email = emailStr.toLowerCase().trim();
    if (email.includes('gsunnyhith')) return 1;
    if (email.includes('gsunnyhit')) return 2;
    if (email.includes('adjuster@')) return 3;
    if (email.includes('admin@')) return 4;
    if (email.includes('adjuster1@')) return 5;
    if (email.includes('compliance') || email.includes('compilance')) return 6;
    if (email.includes('analyst')) return 7;
    if (email.includes('ajai')) return 8;
    if (email.includes('ahilan')) return 9;
    if (email.includes('dharun')) return 10;
    if (email.includes('naad')) return 11;
    return null;
  }

  getDatabaseRoleByEmail(emailStr?: string): string | null {
    if (!emailStr) return null;
    const email = emailStr.toLowerCase().trim();
    if (email.includes('gsunnyhith')) return 'POLICYHOLDER';
    if (email.includes('gsunnyhit')) return 'POLICYHOLDER';
    if (email.includes('adjuster@')) return 'ADJUSTER';
    if (email.includes('admin@')) return 'ADMIN';
    if (email.includes('adjuster1@')) return 'ADJUSTER';
    if (email.includes('compliance') || email.includes('compilance')) return 'COMPLIANCE';
    if (email.includes('analyst')) return 'POLICYHOLDER';
    if (email.includes('ajai')) return 'UNDERWRITER';
    if (email.includes('ahilan')) return 'POLICYHOLDER';
    if (email.includes('dharun')) return 'POLICYHOLDER';
    if (email.includes('naad')) return 'POLICYHOLDER';
    return null;
  }

  getCurrentUserId(): number {
    const u = this.getUser();
    if (u?.userId) return Number(u.userId);

    if (u?.email) {
      const dbId = this.getDatabaseUserIdByEmail(u.email);
      if (dbId !== null) return dbId;

      const registeredList = this.getRegisteredUsersFromLocalStore();
      const match = registeredList.find(ru => ru.email?.toLowerCase() === u.email?.toLowerCase());
      if (match && match.userId) return Number(match.userId);

      return this.getEmailHashId(u.email);
    }

    return 100;
  }

  setUser(user: User): void {
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
        if (user && user.role) {
          const currentLocal = this.getUser();
          user.role = currentLocal?.role || user.role;
          const exactId = this.getDatabaseUserIdByEmail(user.email) || user.userId || this.getEmailHashId(user.email);
          user.userId = exactId;
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

      const registeredList = this.getRegisteredUsersFromLocalStore();
      const match = registeredList.find(ru => ru.email?.toLowerCase().trim() === email.toLowerCase().trim());
      const dbRole = this.getDatabaseRoleByEmail(email);

      // Extract authentic role from JWT payload or registered database record
      const roleExtracted = dbRole || match?.role || payload.role || payload.authorities || 'POLICYHOLDER';
      const dbId = this.getDatabaseUserIdByEmail(email);
      const exactId = dbId !== null ? dbId : (match?.userId || payload.userId || this.getEmailHashId(email));

      const user: User = {
        userId: exactId,
        email: email,
        name: email.split('@')[0],
        role: String(roleExtracted).toUpperCase()
      };
      this.setUser(user);
    } catch (e) {
      console.warn('JWT Decode notice:', e);
      const dbRole = this.getDatabaseRoleByEmail(fallbackEmail) || 'POLICYHOLDER';
      const exactId = this.getDatabaseUserIdByEmail(fallbackEmail) || this.getEmailHashId(fallbackEmail);
      this.setUser({
        userId: exactId,
        email: fallbackEmail,
        name: fallbackEmail.split('@')[0],
        role: dbRole.toUpperCase()
      });
    }
  }
}