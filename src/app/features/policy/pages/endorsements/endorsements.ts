import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EndorsementService, Endorsement } from '../../services/endorsement.service';
import { PolicyService } from '../../services/policy.service';
import { Policy } from '../../models/policy.model';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-endorsements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './endorsements.html',
  styleUrls: ['./endorsements.css']
})
export class EndorsementsComponent implements OnInit {

  private endorsementService = inject(EndorsementService);
  private policyService = inject(PolicyService);
  public authService = inject(AuthService);

  endorsements: Endorsement[] = [];
  policies: Policy[] = [];
  submitting = false;
  loading = false;
  message: string = '';

  private readonly POLICIES_KEY = 'claimedge_clean_policies_master_v12';
  private readonly DELETED_KEY = 'claimedge_clean_deleted_ids_v12';
  private readonly END_POLICIES_KEY = 'claimedge_clean_endorsements_master_v12';
  private readonly END_DELETED_KEY = 'claimedge_clean_end_deleted_ids_v12';

  newEndorsement = {
    policyId: 0,
    changeType: 'Coverage Modification',
    effectiveDate: new Date().toISOString().split('T')[0],
    status: 'Approved'
  };

  changeTypes = [
    'Coverage Modification',
    'Address Change',
    'Beneficiary Update',
    'Vehicle Swap',
    'Add Rider'
  ];

  ngOnInit(): void {
    this.loadPolicies();
    this.loadEndorsements();
  }

  isPolicyAdminOrAdmin(): boolean {
    const role = (this.authService.getRole() || '').toUpperCase();
    if (role === 'POLICYHOLDER') return false;
    return role.includes('POLICY') || role.includes('ADMIN');
  }

  getDeletedIds(): string[] {
    try {
      const stored = localStorage.getItem(this.DELETED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  getEndDeletedIds(): string[] {
    try {
      const stored = localStorage.getItem(this.END_DELETED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  markEndDeleted(id: number | string): void {
    const strId = String(id);
    const deleted = this.getEndDeletedIds();
    if (!deleted.includes(strId)) {
      deleted.push(strId);
      localStorage.setItem(this.END_DELETED_KEY, JSON.stringify(deleted));
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

  getMasterEndorsements(): Endorsement[] {
    try {
      const stored = localStorage.getItem(this.END_POLICIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveMasterEndorsements(list: Endorsement[]): void {
    const cleanList = this.deduplicateEndorsements(list);
    localStorage.setItem(this.END_POLICIES_KEY, JSON.stringify(cleanList));
  }

  loadPolicies(): void {
    const deletedPolicyIds = this.getDeletedIds();
    const localMaster = this.getMasterPolicies();

    // Filter ONLY Active policies that are NOT deleted
    this.policies = localMaster.filter((p: Policy) => p.policyId !== undefined && !deletedPolicyIds.includes(String(p.policyId)) && (p.status === 'Active' || p.status === 'ACTIVE'));

    if (this.policies.length > 0) {
      this.newEndorsement.policyId = this.policies[0].policyId!;
    } else {
      this.newEndorsement.policyId = 0;
    }
  }

  loadEndorsements(): void {
    this.loading = true;
    const deletedIds = this.getEndDeletedIds();
    const master = this.getMasterEndorsements();

    const filtered = master.filter(e => e.endorsementId !== undefined && !deletedIds.includes(String(e.endorsementId)));
    this.endorsements = this.deduplicateEndorsements(filtered);
    this.loading = false;
  }

  deduplicateEndorsements(list: Endorsement[]): Endorsement[] {
    const seen = new Set<string>();
    const result: Endorsement[] = [];

    for (const item of list) {
      if (item.endorsementId === undefined) continue;
      const strId = String(item.endorsementId);
      if (!seen.has(strId)) {
        seen.add(strId);
        result.push(item);
      }
    }
    return result;
  }

  createEndorsement(): void {
    if (this.submitting) return;

    if (!this.isPolicyAdminOrAdmin()) {
      alert('Access Denied: Only Policy Administrator can create policy endorsements.');
      return;
    }

    if (!this.newEndorsement.policyId || this.newEndorsement.policyId === 0) {
      alert('Please select an active policy and change type');
      return;
    }

    this.submitting = true;

    const newId = (Date.now() % 100000);
    const payload = {
      endorsementId: newId,
      policy: { policyId: Number(this.newEndorsement.policyId) },
      changeType: this.newEndorsement.changeType,
      effectiveDate: this.newEndorsement.effectiveDate,
      status: this.newEndorsement.status
    };

    const master = this.getMasterEndorsements();
    master.unshift(payload);
    this.saveMasterEndorsements(master);

    this.endorsementService.createEndorsement(payload).subscribe({ error: () => {} });

    this.submitting = false;
    this.showMessage(`✅ Policy Endorsement created for Policy #${payload.policy.policyId}`);
    this.loadEndorsements();
  }

  deleteEndorsement(id: number): void {
    if (!this.isPolicyAdminOrAdmin()) {
      alert('Access Denied: Only Policy Administrator can delete endorsements.');
      return;
    }
    if (!confirm(`Delete endorsement #${id}?`)) return;

    const strId = String(id);
    this.markEndDeleted(strId);

    const master = this.getMasterEndorsements();
    const updated = master.filter(e => String(e.endorsementId) !== strId);
    this.saveMasterEndorsements(updated);

    this.showMessage(`Endorsement #${id} deleted permanently.`);
    this.loadEndorsements();

    this.endorsementService.deleteEndorsement(id).subscribe({ error: () => {} });
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}
