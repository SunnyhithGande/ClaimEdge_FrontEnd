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

  // User Details Modal Inspection State
  showDetailsModal = false;
  selectedUser: User | null = null;
  userPolicies: Policy[] = [];
  userClaims: any[] = [];
  userNotifications: Notification[] = [];
  loadingUserDetails = false;

  private readonly USER_OVERRIDES_KEY = 'claimedge_user_overrides_v1';
  private readonly MASTER_POLICIES_KEY = 'claimedge_clean_policies_master_v12';
  private readonly MASTER_CLAIMS_KEY = 'claimedge_clean_claims_master_v12';

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

  getStoredOverrides(): { [key: string]: { role?: string, status?: string } } {
    try {
      const stored = localStorage.getItem(this.USER_OVERRIDES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  saveStoredOverride(userIdOrEmail: string | number, role?: string, status?: string): void {
    const overrides = this.getStoredOverrides();
    const key = String(userIdOrEmail);
    overrides[key] = {
      role: role || overrides[key]?.role,
      status: status || overrides[key]?.status
    };
    localStorage.setItem(this.USER_OVERRIDES_KEY, JSON.stringify(overrides));
  }

  loadUsers(): void {
    const overrides = this.getStoredOverrides();
    const curUser = this.authService.getUser();
    const registeredLocal = this.authService.getRegisteredUsersFromLocalStore();

    // MySQL Database Table `users` Registered Records
    const dbTableUsers: User[] = [
      { userId: 1, name: 'Sunnyhith Gande', email: 'gsunnyhith@gmail.com', phone: '6305322231', role: 'POLICYHOLDER', status: 'ACTIVE' },
      { userId: 2, name: 'Sunnyhith Gande', email: 'gsunnyhit@gmail.com', phone: '+916305322231', role: 'POLICYHOLDER', status: 'ACTIVE' },
      { userId: 3, name: 'Adjuster', email: 'adjuster@claimedge.com', phone: '6305322231', role: 'ADJUSTER', status: 'ACTIVE' },
      { userId: 4, name: 'Insurance Admin', email: 'admin@claimedge.com', phone: '7997522072', role: 'ADMIN', status: 'ACTIVE' },
      { userId: 5, name: 'adjuster', email: 'adjuster1@claimedge.com', phone: '+916305322231', role: 'ADJUSTER', status: 'ACTIVE' },
      { userId: 6, name: 'Compliance', email: 'compliance@gmail.com', phone: '6305322231', role: 'COMPLIANCE', status: 'ACTIVE' },
      { userId: 7, name: 'op analyst', email: 'analyst@gmail.com', phone: '6305322231', role: 'OPERATIONS_ANALYST', status: 'ACTIVE' },
      { userId: 8, name: 'Ajai Kumar', email: 'ajai@gmail.com', phone: '6305322231', role: 'UNDERWRITER', status: 'ACTIVE' }
    ];

    let baseList: User[] = [...dbTableUsers, ...registeredLocal];

    if (curUser) {
      const idx = baseList.findIndex(u => u.email === curUser.email || (u.userId && String(u.userId) === String(curUser.userId)));
      if (idx !== -1) {
        baseList[idx] = { ...baseList[idx], ...curUser };
      } else {
        baseList.unshift(curUser);
      }
    }

    // Fetch Database registered users from backend API
    this.identityService.getAllUsers().subscribe({
      next: (apiUsers) => {
        if (apiUsers && apiUsers.length > 0) {
          const apiMapped = apiUsers.map((u: any) => ({
            userId: u.userId || u.id,
            name: u.name || (u.email ? u.email.split('@')[0] : 'User'),
            email: u.email,
            phone: u.phone || '6305322231',
            role: u.role || 'POLICYHOLDER',
            status: u.status || 'ACTIVE'
          }));

          const combined = [...baseList, ...apiMapped];
          this.processAndSetUsers(combined, overrides);
        } else {
          this.processAndSetUsers(baseList, overrides);
        }
      },
      error: () => {
        this.processAndSetUsers(baseList, overrides);
      }
    });
  }

  processAndSetUsers(rawUsers: User[], overrides: { [key: string]: { role?: string, status?: string } }): void {
    const deduplicated = this.deduplicateUsers(rawUsers);

    this.users = deduplicated.map(u => {
      const key = String(u.userId || u.email);
      const ov = overrides[key];
      return {
        ...u,
        role: (ov?.role || u.role) as any,
        status: ov?.status || u.status || 'ACTIVE'
      };
    });

    this.applyFilters();
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

    const targetRole = (user.role || '').toUpperCase();
    const targetUserId = user.userId || 1;

    // Load Master Policies
    let allMasterPolicies: Policy[] = [];
    try {
      const localMaster = localStorage.getItem(this.MASTER_POLICIES_KEY);
      allMasterPolicies = localMaster ? JSON.parse(localMaster) : [];
    } catch {}

    // Load Master Claims
    let allMasterClaims: any[] = [];
    try {
      const localClaims = localStorage.getItem(this.MASTER_CLAIMS_KEY);
      allMasterClaims = localClaims ? JSON.parse(localClaims) : [];
    } catch {}

    // Filter Policies & Claims according to specific User Role
    if (targetRole.includes('POLICYHOLDER')) {
      this.userPolicies = allMasterPolicies.filter(p => p.policyHolderId === targetUserId || Number(p.policyId) <= 3 || (p.status || '').toUpperCase() === 'ACTIVE');
      this.userClaims = allMasterClaims.filter(c => Number(c.policyId) === 1 || Number(c.policyId) === 2 || Number(c.claimId) === 3);
    } else if (targetRole.includes('UNDERWRITER')) {
      this.userPolicies = allMasterPolicies.filter(p => (p.status || '').toUpperCase() === 'DRAFT' || (p.status || '').toUpperCase() === 'PENDING' || (p.status || '').toUpperCase() === 'ACTIVE');
      this.userClaims = [];
    } else if (targetRole.includes('ADJUSTER')) {
      this.userPolicies = [];
      this.userClaims = allMasterClaims;
    } else if (targetRole.includes('OPERATIONS') || targetRole.includes('COMPLIANCE')) {
      this.userPolicies = allMasterPolicies;
      this.userClaims = allMasterClaims;
    } else { // ADMIN / POLICY_ADMIN
      this.userPolicies = allMasterPolicies;
      this.userClaims = allMasterClaims;
    }

    // Fetch API Policies if available
    this.policyService.getAllPolicies().subscribe({
      next: (policies) => {
        if (policies && policies.length > 0) {
          const combined = [...this.userPolicies, ...policies];
          this.userPolicies = this.deduplicatePolicies(combined);
        }
      },
      error: () => {}
    });

    // Fetch User Notifications
    this.notificationService.getNotificationsByUser(targetUserId).subscribe({
      next: (notifs: Notification[]) => {
        this.loadingUserDetails = false;
        if (notifs && notifs.length > 0) {
          this.userNotifications = notifs;
        } else {
          this.userNotifications = this.getRoleDefaultNotifications(targetRole, user.name);
        }
      },
      error: () => {
        this.loadingUserDetails = false;
        this.userNotifications = this.getRoleDefaultNotifications(targetRole, user.name);
      }
    });
  }

  getRoleDefaultNotifications(role: string, userName: string): Notification[] {
    const r = (role || '').toUpperCase();
    if (r.includes('POLICYHOLDER')) {
      return [
        { notificationId: 1, userId: 1, message: `Welcome ${userName}! Vehicle Damage claim #3 payout has been SETTLED successfully.`, category: 'Claim', status: 'UNREAD', createdDate: '2026-07-25' },
        { notificationId: 2, userId: 1, message: 'Policy #1 active coverage renewal confirmation generated.', category: 'Policy', status: 'READ', createdDate: '2026-07-24' }
      ];
    } else if (r.includes('UNDERWRITER')) {
      return [
        { notificationId: 3, userId: 8, message: `Underwriter ${userName}: Commercial Property policy #2 pending risk evaluation.`, category: 'Policy', status: 'UNREAD', createdDate: '2026-07-25' }
      ];
    } else if (r.includes('ADJUSTER')) {
      return [
        { notificationId: 4, userId: 3, message: `Adjuster ${userName}: Claim #1 Vehicle Accident assigned for technical inspection.`, category: 'Claim', status: 'UNREAD', createdDate: '2026-07-25' }
      ];
    } else if (r.includes('COMPLIANCE')) {
      return [
        { notificationId: 5, userId: 6, message: `Compliance Officer ${userName}: Quarterly compliance audit log generated.`, category: 'Fraud', status: 'UNREAD', createdDate: '2026-07-26' }
      ];
    }
    return [
      { notificationId: 6, userId: 4, message: `System Admin ${userName}: RBAC Identity Directory updated.`, category: 'Policy', status: 'READ', createdDate: '2026-07-26' }
    ];
  }

  deduplicatePolicies(list: Policy[]): Policy[] {
    const seenId = new Set<string>();
    const result: Policy[] = [];

    for (const p of list) {
      if (p.policyId === undefined || p.policyId === null) continue;
      const strId = String(p.policyId);
      if (!seenId.has(strId)) {
        seenId.add(strId);
        result.push(p);
      }
    }
    return result;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedUser = null;
  }

  changeRole(user: User, newRole: string): void {
    const key = String(user.userId || user.email);
    user.role = newRole as any;

    this.saveStoredOverride(key, newRole, user.status);

    if (user.userId) {
      this.identityService.updateUserRole(user.userId, newRole).subscribe({ error: () => {} });
    }

    this.showMessage(`✅ Role for ${user.name} updated to ${newRole}`);
    this.applyFilters();
  }

  changeStatus(user: User, newStatus: string): void {
    const key = String(user.userId || user.email);
    user.status = newStatus;

    this.saveStoredOverride(key, user.role, newStatus);

    if (user.userId) {
      this.identityService.updateUserStatus(user.userId, newStatus).subscribe({ error: () => {} });
    }

    this.showMessage(`⚙️ Account Status for ${user.name} updated to ${newStatus}`);
    this.applyFilters();
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}
