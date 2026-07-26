import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService, Notification } from '../../services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-notifications-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications-list.html',
  styleUrls: ['./notifications-list.css']
})
export class NotificationsListComponent implements OnInit {

  private service = inject(NotificationService);
  private authService = inject(AuthService);

  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  message: string = '';

  filterDate: string = '';
  selectedCategory: string = '';

  ngOnInit(): void {
    this.loadNotifications();
  }

  get currentUserId(): number {
    return this.authService.getCurrentUserId();
  }

  loadNotifications(): void {
    const userId = this.currentUserId;
    this.service.getNotificationsByUser(userId).subscribe({
      next: (data) => {
        let list = data || [];
        // Ensure sorted by recent date & time (latest notification first)
        list.sort((a, b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime());
        this.notifications = list;
        this.applyFilters();
      },
      error: () => {
        const master = this.service.getMasterNotifications();
        let list = master.filter(n => Number(n.userId) === Number(userId));
        list.sort((a, b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime());
        this.notifications = list;
        this.applyFilters();
      }
    });
  }

  applyFilters(): void {
    let result = [...this.notifications];

    // Date Filter
    if (this.filterDate) {
      result = result.filter(n => {
        if (!n.createdDate) return false;
        const nDate = new Date(n.createdDate).toISOString().split('T')[0];
        return nDate === this.filterDate;
      });
    }

    // Category Filter
    if (this.selectedCategory) {
      result = result.filter(n => n.category === this.selectedCategory);
    }

    // Always sort by latest date first
    result.sort((a, b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime());
    this.filteredNotifications = result;
  }

  clearDateFilter(): void {
    this.filterDate = '';
    this.applyFilters();
  }

  markRead(id: number): void {
    this.service.markAsRead(id).subscribe({
      next: () => {
        const n = this.notifications.find(item => item.notificationId === id);
        if (n) n.status = 'READ';
        this.applyFilters();
        this.showMessage(`Notification marked as read.`);
      },
      error: () => {
        const n = this.notifications.find(item => item.notificationId === id);
        if (n) n.status = 'READ';
        this.applyFilters();
        this.showMessage(`Notification marked as read.`);
      }
    });
  }

  dismiss(id: number): void {
    this.service.dismiss(id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.notificationId !== id);
        this.applyFilters();
        this.showMessage(`Notification deleted.`);
      },
      error: () => {
        this.notifications = this.notifications.filter(n => n.notificationId !== id);
        this.applyFilters();
        this.showMessage(`Notification deleted.`);
      }
    });
  }

  deleteAll(): void {
    if (!confirm('Are you sure you want to delete all notifications?')) return;

    this.service.deleteAllUserNotifications(this.currentUserId).subscribe({
      next: () => {
        this.notifications = [];
        this.filteredNotifications = [];
        this.showMessage(`All notifications deleted successfully.`);
      }
    });
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}
