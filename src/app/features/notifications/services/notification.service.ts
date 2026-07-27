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

  getNotificationsByUser(userId: number): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}`).pipe(
      catchError(() => of([]))
    );
  }

  createNotification(userId: number, message: string, category: string): Observable<Notification> {
    const payload: Notification = {
      userId: Number(userId),
      message: message,
      category: category,
      status: 'UNREAD',
      createdDate: new Date().toISOString()
    };

    return this.http.post<Notification>(`${this.apiUrl}?userId=${userId}&message=${encodeURIComponent(message)}&category=${encodeURIComponent(category)}`, payload).pipe(
      catchError(() => of(payload))
    );
  }

  markAsRead(id: number): Observable<Notification> {
    return this.http.put<Notification>(`${this.apiUrl}/${id}/read`, {}).pipe(
      catchError(() => of({ notificationId: id, status: 'READ' } as Notification))
    );
  }

  dismiss(id: number): Observable<Notification> {
    return this.http.put<Notification>(`${this.apiUrl}/${id}/dismiss`, {}).pipe(
      catchError(() => of({ notificationId: id, status: 'DISMISSED' } as Notification))
    );
  }

  deleteAllUserNotifications(userId: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/user/${userId}`).pipe(
      catchError(() => of(true))
    );
  }
}
