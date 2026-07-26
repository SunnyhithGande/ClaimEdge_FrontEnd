import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PolicyService } from '../../services/policy.service';
import { Policy } from '../../models/policy.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../notifications/services/notification.service';

export interface AvailablePolicyPlan {
  planId: string;
  productType: string;
  title: string;
  description: string;
  coverageAmount: number;
  premium: number;
  icon: string;
  features: string[];
}

@Component({
  selector: 'app-policy-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './policy-list.html',
  styleUrls: ['./policy-list.css']
})
export class PolicyListComponent implements OnInit {

  private policyService = inject(PolicyService);
  public authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  policies: Policy[] = [];
  message: string = '';
  showCreateModal = false;

  activeTab: 'MY_POLICIES' | 'SUBSCRIBE' | 'POLICY_ADMIN' | 'POLICY_HOLDERS' = 'MY_POLICIES';

  private readonly POLICIES_KEY = 'claimedge_clean_policies_master_v12';
  private readonly DELETED_KEY = 'claimedge_clean_deleted_ids_v12';

  availablePlans: AvailablePolicyPlan[] = [
    {
      planId: 'PLAN_MOTOR_01',
      productType: 'Motor Insurance',
      title: 'Comprehensive Motor Guard',
      description: 'Zero-depreciation motor coverage against accidents, natural disasters, and third-party liabilities.',
      coverageAmount: 500000,
      premium: 15000,
      icon: 'bi-car-front-fill',
      features: ['24/7 Roadside Assistance', 'Cashless Garage Repair Network', 'Zero Depreciation Cover']
    },
    {
      planId: 'PLAN_HEALTH_02',
      productType: 'Health Insurance',
      title: 'Individual Health Shield',
      description: 'Complete health protection including cashless hospitalization, pre/post care, and critical illness cover.',
      coverageAmount: 1000000,
      premium: 25000,
      icon: 'bi-heart-pulse-fill',
      features: ['Over 10,000 Cashless Hospitals', 'No Pre-Medical Checkup Required', 'Free Annual Health Checkup']
    },
    {
      planId: 'PLAN_LIFE_03',
      productType: 'Life Insurance',
      title: 'Term Life Care Assurance',
      description: 'Long-term financial security for your family with guaranteed payout and terminal illness benefits.',
      coverageAmount: 2500000,
      premium: 30000,
      icon: 'bi-person-shield',
      features: ['High Sum Assured Coverage', 'Tax Savings under Section 80C', 'Accidental Death Benefit']
    },
    {
      planId: 'PLAN_PROP_04',
      productType: 'Property Insurance',
      title: 'Property & Home Protect',
      description: 'Comprehensive safeguard against fire, theft, flood, and structural property damages.',
      coverageAmount: 1500000,
      premium: 18000,
      icon: 'bi-house-heart-fill',
      features: ['Home Structure & Content Cover', 'Temporary Resettlement Expenses', 'Natural Calamity Protection']
    }
  ];

  newPolicy: Policy = {
    policyHolderId: 1,
    productType: 'Motor Insurance',
    coverageAmount: 500000,
    premium: 12000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    status: 'Draft'
  };

  productTypes = [
    'Motor Insurance',
    'Health Insurance',
    'Life Insurance',
    'Property Insurance'
  ];

  statusOptions = [
    'Draft',
    'Active',
    'Lapsed',
    'Cancelled'
  ];

  ngOnInit(): void {
    this.initDefaultPoliciesIfEmpty();
    this.loadPolicies();

    if (this.isPolicyHolder) {
      this.activeTab = 'MY_POLICIES';
    } else {
      this.activeTab = 'POLICY_ADMIN';
    }
  }

  get userRole(): string {
    return this.authService.getRole();
  }

  get isPolicyHolder(): boolean {
    const role = (this.userRole || '').toUpperCase();
    return role === 'POLICYHOLDER';
  }

  isPolicyAdminOrAdmin(): boolean {
    const role = (this.userRole || '').toUpperCase();
    if (role === 'POLICYHOLDER') return false;
    return role.includes('POLICY') || role.includes('ADMIN');
  }

  // Filter master policies for Policy Administration tab (excluding Pending Underwriting)
  get adminMasterPolicies(): Policy[] {
    return this.policies.filter(p => p.status !== 'Pending Underwriting' && p.status !== 'Approved - Pending Payment');
  }

  getDeletedIds(): string[] {
    try {
      const stored = localStorage.getItem(this.DELETED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  markDeleted(id: number | string): void {
    const strId = String(id);
    const deleted = this.getDeletedIds();
    if (!deleted.includes(strId)) {
      deleted.push(strId);
      localStorage.setItem(this.DELETED_KEY, JSON.stringify(deleted));
    }
  }

  getMasterPolicies(): Policy[] {
    try {
      const stored = localStorage.getItem(this.POLICIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveMasterPolicies(list: Policy[]): void {
    const cleanList = this.deduplicatePolicies(list);
    localStorage.setItem(this.POLICIES_KEY, JSON.stringify(cleanList));
  }

  initDefaultPoliciesIfEmpty(): void {
    const existing = this.getMasterPolicies();
    if (existing.length === 0 && !localStorage.getItem('claimedge_initialized_v12')) {
      const initialSample: Policy[] = [
        { policyId: 101, policyHolderId: 1, productType: 'Motor Insurance', coverageAmount: 500000, premium: 15000, startDate: '2026-01-01', endDate: '2027-01-01', status: 'Active' },
        { policyId: 102, policyHolderId: 2, productType: 'Health Insurance', coverageAmount: 1000000, premium: 25000, startDate: '2026-02-15', endDate: '2027-02-15', status: 'Active' }
      ];
      this.saveMasterPolicies(initialSample);
      localStorage.setItem('claimedge_initialized_v12', 'true');
    }
  }

  deduplicatePolicies(list: Policy[]): Policy[] {
    const seenId = new Set<string>();
    const seenContent = new Set<string>();
    const result: Policy[] = [];

    for (const p of list) {
      if (p.policyId === undefined || p.policyId === null) continue;
      const strId = String(p.policyId);
      const contentKey = `${p.policyHolderId}_${p.productType}_${p.coverageAmount}_${p.premium}_${p.startDate}_${p.endDate}`;

      if (!seenId.has(strId) && !seenContent.has(contentKey)) {
        seenId.add(strId);
        seenContent.add(contentKey);
        result.push(p);
      }
    }
    return result;
  }

  loadPolicies(): void {
    const deletedIds = this.getDeletedIds();
    const master = this.getMasterPolicies();

    const filtered = master.filter((p: Policy) => p.policyId !== undefined && !deletedIds.includes(String(p.policyId)));
    const cleanList = this.deduplicatePolicies(filtered);

    if (this.isPolicyHolder) {
      const currentUserId = this.authService.getCurrentUserId();
      this.policies = cleanList.filter(p => String(p.policyHolderId) === String(currentUserId));
    } else {
      this.policies = cleanList;
    }
  }

  subscribeToPolicy(plan: AvailablePolicyPlan): void {
    const newId = Math.floor(10000 + Math.random() * 90000);
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
    const currentUserId = this.authService.getCurrentUserId();

    const subscribedPolicy: Policy = {
      policyId: newId,
      policyHolderId: currentUserId,
      productType: plan.productType,
      coverageAmount: plan.coverageAmount,
      premium: plan.premium,
      startDate: startDate,
      endDate: endDate,
      status: 'Pending Underwriting'
    };

    const master = this.getMasterPolicies();
    master.unshift(subscribedPolicy);
    this.saveMasterPolicies(master);

    this.policyService.createPolicy(subscribedPolicy).subscribe({ error: () => {} });

    // Notification to Underwriter
    this.notificationService.createNotification(
      102,
      `New Policy Application #${newId} (${plan.productType}) submitted by Policyholder #${currentUserId} for Underwriting Risk Review.`,
      'Policy'
    ).subscribe({ error: () => {} });

    this.showMessage(`🎉 Successfully Applied for ${plan.title}! Policy #${newId} is now Pending Underwriting Review.`);
    this.loadPolicies();
    this.activeTab = 'MY_POLICIES';
  }

  goToPaymentModule(p: Policy): void {
    this.router.navigate(['/payments/premium-payments'], { queryParams: { policyId: p.policyId } });
  }

  sendDualNotification(policyHolderId: number, message: string): void {
    this.notificationService.createNotification(policyHolderId || 1, message, 'Policy').subscribe({ error: () => {} });
    this.notificationService.createNotification(106, message, 'Policy').subscribe({ error: () => {} });
  }

  createPolicy(): void {
    if (!this.isPolicyAdminOrAdmin()) {
      alert('Access Denied: Only Policy Administrator can create policies.');
      return;
    }

    const newId = (Date.now() % 100000);
    const statusVal = this.newPolicy.status || 'Draft';
    const currentUserId = this.authService.getCurrentUserId();

    const policyObj: Policy = {
      ...this.newPolicy,
      policyId: newId,
      policyHolderId: this.newPolicy.policyHolderId || currentUserId,
      status: statusVal
    };

    const strId = String(newId);
    const deleted = this.getDeletedIds().filter(id => id !== strId);
    localStorage.setItem(this.DELETED_KEY, JSON.stringify(deleted));

    const master = this.getMasterPolicies();
    const updatedMaster = master.filter(p => String(p.policyId) !== strId);
    updatedMaster.unshift(policyObj);
    this.saveMasterPolicies(updatedMaster);

    this.policyService.createPolicy(policyObj).subscribe({ error: () => {} });

    const notifMsg = `Policy Administrator created Policy #${newId} (${policyObj.productType}) for Policyholder #${policyObj.policyHolderId} with status: ${statusVal}.`;
    this.sendDualNotification(policyObj.policyHolderId || currentUserId, notifMsg);

    this.showMessage(`✅ Policy #${newId} Created Successfully! Notifications sent.`);
    this.showCreateModal = false;
    this.loadPolicies();
  }

  // POLICY ADMIN ACTION: ACTIVATE POLICY
  activatePolicy(id: number): void {
    if (!this.isPolicyAdminOrAdmin()) return;

    const master = this.getMasterPolicies();
    let targetHolderId = 1;
    let productType = '';

    const updated = master.map(item => {
      if (String(item.policyId) === String(id)) {
        targetHolderId = item.policyHolderId || 1;
        productType = item.productType;
        return { ...item, status: 'Active' };
      }
      return item;
    });
    this.saveMasterPolicies(updated);

    this.policyService.activatePolicy(id).subscribe({ error: () => {} });

    const notifMsg = `Policy #${id} (${productType}) has been ACTIVATED by Policy Administrator. Policyholder can now view active coverage.`;
    this.sendDualNotification(targetHolderId, notifMsg);

    this.showMessage(`✅ Policy #${id} Activated Successfully! Status updated to Active.`);
    this.loadPolicies();
  }

  amendPolicy(p: Policy): void {
    if (!this.isPolicyAdminOrAdmin()) {
      alert('Access Denied: Only Policy Administrator can amend policies.');
      return;
    }

    const newCov = prompt(`Amend Policy #${p.policyId} Coverage Amount (₹):`, p.coverageAmount.toString());
    if (!newCov) return;
    const newPrem = prompt(`Amend Policy #${p.policyId} Annual Premium (₹):`, p.premium.toString());
    if (!newPrem) return;

    p.coverageAmount = Number(newCov);
    p.premium = Number(newPrem);

    const master = this.getMasterPolicies();
    const updated = master.map(item => String(item.policyId) === String(p.policyId) ? { ...p } : item);
    this.saveMasterPolicies(updated);

    this.policyService.updatePolicy(p.policyId!, p).subscribe({ error: () => {} });

    const notifMsg = `Policy Administrator amended Policy #${p.policyId} (${p.productType}): New Coverage ₹${p.coverageAmount}, Premium ₹${p.premium}.`;
    this.sendDualNotification(p.policyHolderId || 1, notifMsg);

    this.showMessage(`✅ Policy #${p.policyId} Amended Successfully! Notifications sent.`);
    this.loadPolicies();
  }

  lapsePolicy(id: number): void {
    if (!this.isPolicyAdminOrAdmin()) return;

    const master = this.getMasterPolicies();
    let targetPolicyHolderId = 1;
    let productType = '';

    const updated = master.map(item => {
      if (String(item.policyId) === String(id)) {
        targetPolicyHolderId = item.policyHolderId || 1;
        productType = item.productType;
        return { ...item, status: 'Lapsed' };
      }
      return item;
    });
    this.saveMasterPolicies(updated);

    const notifMsg = `Policy #${id} (${productType}) has been marked as LAPSED by Policy Administrator due to non-payment.`;
    this.sendDualNotification(targetPolicyHolderId, notifMsg);

    this.showMessage(`⚠️ Policy #${id} marked as Lapsed. Notifications sent.`);
    this.loadPolicies();
  }

  // POLICY ADMIN ACTION: CANCEL POLICY
  cancelPolicy(id: number): void {
    if (!this.isPolicyAdminOrAdmin()) return;

    const master = this.getMasterPolicies();
    let targetPolicyHolderId = 1;
    let productType = '';

    const updated = master.map(item => {
      if (String(item.policyId) === String(id)) {
        targetPolicyHolderId = item.policyHolderId || 1;
        productType = item.productType;
        return { ...item, status: 'Cancelled' };
      }
      return item;
    });
    this.saveMasterPolicies(updated);

    this.policyService.cancelPolicy(id).subscribe({ error: () => {} });

    const notifMsg = `Policy #${id} (${productType}) has been CANCELLED by Policy Administrator.`;
    this.sendDualNotification(targetPolicyHolderId, notifMsg);

    this.showMessage(`🚫 Policy #${id} Cancelled by Policy Administrator.`);
    this.loadPolicies();
  }

  renewPolicy(id: number): void {
    const master = this.getMasterPolicies();
    let targetPolicyHolderId = 1;
    let productType = '';
    let newEndDate = '';

    const updated = master.map(item => {
      if (String(item.policyId) === String(id)) {
        targetPolicyHolderId = item.policyHolderId || 1;
        productType = item.productType;
        const currEnd = new Date(item.endDate || new Date());
        currEnd.setFullYear(currEnd.getFullYear() + 1);
        newEndDate = currEnd.toISOString().split('T')[0];
        return { ...item, status: 'Active', endDate: newEndDate };
      }
      return item;
    });
    this.saveMasterPolicies(updated);

    this.policyService.renewPolicy(id).subscribe({ error: () => {} });

    const notifMsg = `Policy #${id} (${productType}) has been RENEWED by Policy Administrator until ${newEndDate}.`;
    this.sendDualNotification(targetPolicyHolderId, notifMsg);

    this.showMessage(`🔄 Policy #${id} Renewed for 1 Year! Notifications sent.`);
    this.loadPolicies();
  }

  deletePolicy(id: number): void {
    if (!this.isPolicyAdminOrAdmin()) return;
    if (!confirm('Are you sure you want to delete policy #' + id + '?')) return;

    const strId = String(id);
    this.markDeleted(strId);

    const master = this.getMasterPolicies();
    const updatedMaster = master.filter(p => String(p.policyId) !== strId);
    this.saveMasterPolicies(updatedMaster);

    this.showMessage(`Policy #${id} deleted permanently.`);
    this.loadPolicies();

    this.policyService.deletePolicy(id).subscribe({ error: () => {} });
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}