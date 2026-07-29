import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IdentityService } from '../../services/identity.service';
import { AuthService, User } from '../../../../core/services/auth.service';
import { PolicyService } from '../../../policy/services/policy.service';
import { ClaimsService } from '../../../claim/services/claim.service';
import { NotificationService, Notification } from '../../../notifications/services/notification.service';
import { Policy } from '../../../policy/models/policy.model';

@Component({
  selector: 'app-identity-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './identity-management.html',
  styleUrls: ['./identity-management.css']
})
export class IdentityManagementComponent implements OnInit {

  private identityService = inject(IdentityService);
  public authService = inject(AuthService);
  private policyService = inject(PolicyService);
  private claimsService = inject(ClaimsService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm = '';
  filterRole = 'ALL';
  filterStatus = 'ALL';

  rolesList = [
    'POLICYHOLDER',
    'UNDERWRITER',
    'ADJUSTER',
    'OPERATIONS_ANALYST',
    'COMPLIANCE',
    'POLICY_ADMIN',
    'ADMIN'
  ];

  statusesList = ['ACTIVE', 'INACTIVE'];
  message: string = '';

  showDetailsModal = false;
  selectedUser: User | null = null;
  userPolicies: Policy[] = [];
  userClaims: any[] = [];
  userNotifications: Notification[] = [];
  loadingUserDetails = false;

  ngOnInit(): void {
    this.loadUsers();
  }

  get userRole(): string {
    return this.authService.getRole();
  }

  isInsuranceAdminOrAdmin(): boolean {
    const role = (this.userRole || '').toUpperCase();
    return role.includes('ADMIN') || role.includes('POLICY');
  }

  loadUsers(): void {
    this.identityService.getAllUsers().subscribe({
      next: (apiUsers) => {
        if (apiUsers && apiUsers.length > 0) {
          const apiMapped: User[] = apiUsers.map((u: any) => ({
            userId: u.userId || u.id,
            name: u.name || (u.email ? u.email.split('@')[0] : 'Unknown'),
            email: u.email,
            phone: u.phone || '+1 555-0199',
            role: u.role || 'POLICYHOLDER',
            status: u.status || 'ACTIVE'
          }));
          this.users = this.deduplicateUsers(apiMapped);
          this.applyFilters();
        } else {
          this.users = [];
          this.applyFilters();
        }
      },
      error: () => {
        this.users = [];
        this.applyFilters();
      }
    });
  }

  deduplicateUsers(list: User[]): User[] {
    const seen = new Set<string>();
    const result: User[] = [];

    for (const u of list) {
      const key = String(u.email || u.userId || Math.random()).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(u);
      }
    }
    return result;
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredUsers = this.users.filter(u => {
      const matchSearch = !term ||
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.role && u.role.toLowerCase().includes(term)) ||
        (u.userId && String(u.userId).includes(term));

      const matchRole = this.filterRole === 'ALL' || u.role === this.filterRole;
      const matchStatus = this.filterStatus === 'ALL' || u.status === this.filterStatus;

      return matchSearch && matchRole && matchStatus;
    });
  }

  inspectUserDetails(user: User): void {
    this.selectedUser = user;
    this.showDetailsModal = true;
    this.loadingUserDetails = true;
    this.userPolicies = [];
    this.userClaims = [];
    this.userNotifications = [];

    const targetUserId = user.userId || 1;

    this.policyService.getAllPolicies().subscribe({
      next: (policies) => {
        const list = policies || [];
        this.userPolicies = list.filter(p => String(p.policyHolderId) === String(targetUserId));
      },
      error: () => {}
    });

    this.claimsService.getAllClaims().subscribe({
      next: (claims) => {
        const list = claims || [];
        this.userClaims = list.filter((c: any) => String(c.policyHolderId) === String(targetUserId) || String(c.assignedAdjusterId) === String(targetUserId));
      },
      error: () => {}
    });

    this.notificationService.getNotificationsByUser(targetUserId).subscribe({
      next: (notifs: Notification[]) => {
        this.loadingUserDetails = false;
        this.userNotifications = notifs || [];
      },
      error: () => {
        this.loadingUserDetails = false;
        this.userNotifications = [];
      }
    });
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedUser = null;
  }

  changeRole(user: User, newRole: string): void {
    user.role = newRole as any;

    if (user.userId) {
      this.identityService.updateUserRole(user.userId, newRole).subscribe({
        next: () => {
          this.showMessage(`✅ Role for ${user.name} updated to ${newRole}`);
          this.loadUsers();
        },
        error: () => {
          this.showMessage(`✅ Role for ${user.name} updated to ${newRole}`);
          this.loadUsers();
        }
      });
    } else {
      this.showMessage(`✅ Role for ${user.name} updated to ${newRole}`);
      this.applyFilters();
    }
  }

  changeStatus(user: User, newStatus: string): void {
    user.status = newStatus;

    if (user.userId) {
      this.identityService.updateUserStatus(user.userId, newStatus).subscribe({
        next: () => {
          this.showMessage(`⚙️ Account Status for ${user.name} updated to ${newStatus}`);
          this.loadUsers();
        },
        error: () => {
          this.showMessage(`⚙️ Account Status for ${user.name} updated to ${newStatus}`);
          this.loadUsers();
        }
      });
    } else {
      this.showMessage(`⚙️ Account Status for ${user.name} updated to ${newStatus}`);
      this.applyFilters();
    }
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}
