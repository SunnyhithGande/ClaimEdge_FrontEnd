import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface Notification {
  notificationId?: number;
  userId: number;
  message: string;
  category: 'Policy' | 'Claim' | 'Payment' | 'Fraud' | string;
  status: 'UNREAD' | 'READ' | 'DISMISSED' | string;
  createdDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notifications`;
  private readonly NOTIFICATIONS_KEY = 'claimedge_notifications_master_v1';

  constructor() {
    this.initDefaultNotificationsIfEmpty();
  }

  getMasterNotifications(): Notification[] {
    try {
      const stored = localStorage.getItem(this.NOTIFICATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveMasterNotifications(list: Notification[]): void {
    localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(list));
  }

  initDefaultNotificationsIfEmpty(): void {
    const existing = this.getMasterNotifications();
    if (existing.length === 0) {
      const initial: Notification[] = [
        {
          notificationId: 1001,
          userId: 1,
          message: 'Welcome to ClaimEdge! Your Motor Insurance Policy #101 is ACTIVE.',
          category: 'Policy',
          status: 'UNREAD',
          createdDate: new Date(Date.now() - 3600000 * 5).toISOString()
        },
        {
          notificationId: 1002,
          userId: 9,
          message: 'Your Policy Application #17464 (Life Insurance) is Pending Underwriting Review.',
          category: 'Policy',
          status: 'UNREAD',
          createdDate: new Date(Date.now() - 3600000 * 2).toISOString()
        }
      ];
      this.saveMasterNotifications(initial);
    }
  }

  getNotificationsByUser(userId: number): Observable<Notification[]> {
    const master = this.getMasterNotifications();
    const userNotifs = master.filter(n => Number(n.userId) === Number(userId));

    // Sort by recent date and time (Latest notification first)
    userNotifs.sort((a, b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime());

    return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}`).pipe(
      catchError(() => of(userNotifs))
    );
  }

  createNotification(userId: number, message: string, category: string): Observable<Notification> {
    const newNotif: Notification = {
      notificationId: Date.now(),
      userId: Number(userId),
      message: message,
      category: category,
      status: 'UNREAD',
      createdDate: new Date().toISOString()
    };

    const master = this.getMasterNotifications();
    master.unshift(newNotif);
    this.saveMasterNotifications(master);

    return this.http.post<Notification>(`${this.apiUrl}?userId=${userId}&message=${encodeURIComponent(message)}&category=${encodeURIComponent(category)}`, {}).pipe(
      catchError(() => of(newNotif))
    );
  }

  markAsRead(id: number): Observable<Notification> {
    const master = this.getMasterNotifications();
    const updated = master.map(n => n.notificationId === id ? { ...n, status: 'READ' } : n);
    this.saveMasterNotifications(updated);

    return this.http.put<Notification>(`${this.apiUrl}/${id}/read`, {}).pipe(
      catchError(() => of({ notificationId: id, status: 'READ' } as Notification))
    );
  }

  dismiss(id: number): Observable<Notification> {
    const master = this.getMasterNotifications();
    const updated = master.filter(n => n.notificationId !== id);
    this.saveMasterNotifications(updated);

    return this.http.put<Notification>(`${this.apiUrl}/${id}/dismiss`, {}).pipe(
      catchError(() => of({ notificationId: id, status: 'DISMISSED' } as Notification))
    );
  }

  deleteAllUserNotifications(userId: number): Observable<boolean> {
    const master = this.getMasterNotifications();
    const updated = master.filter(n => Number(n.userId) !== Number(userId));
    this.saveMasterNotifications(updated);
    return of(true);
  }
}
