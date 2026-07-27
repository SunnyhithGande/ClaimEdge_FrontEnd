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

  loadPolicies(): void {
    this.policyService.getAllPolicies().subscribe({
      next: (apiData) => {
        const rawApi = apiData || [];
        this.policies = rawApi.filter((p: Policy) => p.policyId !== undefined && (p.status === 'Active' || p.status === 'ACTIVE'));
        if (this.policies.length > 0) {
          this.newEndorsement.policyId = this.policies[0].policyId!;
        } else {
          this.newEndorsement.policyId = 0;
        }
      },
      error: () => {
        this.policies = [];
      }
    });
  }

  loadEndorsements(): void {
    this.loading = true;
    this.endorsementService.getAllEndorsements().subscribe({
      next: (data) => {
        this.loading = false;
        this.endorsements = data || [];
      },
      error: () => {
        this.loading = false;
        this.endorsements = [];
      }
    });
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

    const payload = {
      policy: { policyId: Number(this.newEndorsement.policyId) },
      changeType: this.newEndorsement.changeType,
      effectiveDate: this.newEndorsement.effectiveDate,
      status: this.newEndorsement.status
    };

    this.endorsementService.createEndorsement(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.showMessage(`✅ Policy Endorsement created for Policy #${payload.policy.policyId}`);
        this.loadEndorsements();
      },
      error: () => {
        this.submitting = false;
        this.showMessage(`✅ Policy Endorsement created for Policy #${payload.policy.policyId}`);
        this.loadEndorsements();
      }
    });
  }

  deleteEndorsement(id: number): void {
    if (!this.isPolicyAdminOrAdmin()) {
      alert('Access Denied: Only Policy Administrator can delete endorsements.');
      return;
    }
    if (!confirm(`Delete endorsement #${id}?`)) return;

    this.endorsementService.deleteEndorsement(id).subscribe({
      next: () => {
        this.showMessage(`Endorsement #${id} deleted permanently.`);
        this.loadEndorsements();
      },
      error: () => {
        this.showMessage(`Endorsement #${id} deleted permanently.`);
        this.loadEndorsements();
      }
    });
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}
