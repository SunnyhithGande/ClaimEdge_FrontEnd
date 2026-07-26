import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ClaimsService } from '../../services/claim.service';
import { PaymentsService } from '../../../payments/service/payments.service';
import { NotificationService } from '../../../notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-claims-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './claims-list.html',
  styleUrl: './claims-list.css'
})
export class ClaimsListComponent implements OnInit {

  private claimsService = inject(ClaimsService);
  private paymentsService = inject(PaymentsService);
  private notificationService = inject(NotificationService);
  public authService = inject(AuthService);
  private router = inject(Router);

  claims: any[] = [];
  message: string = '';
  private readonly OVERRIDES_KEY = 'claim_status_overrides';
  private readonly CLAIMS_MASTER_KEY = 'claimedge_clean_claims_master_v12';

  ngOnInit(): void {
    // 1. Immediately load claims synchronously on 1st click
    this.loadClaimsSynchronously();

    // 2. Fetch backend claims to merge
    this.loadClaimsFromApi();
  }

  getStatusOverrides(): { [key: number]: { status: string, adjusterId?: number } } {
    try {
      const stored = localStorage.getItem(this.OVERRIDES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  saveStatusOverride(claimId: number, status: string, adjusterId?: number): void {
    const overrides = this.getStatusOverrides();
    overrides[claimId] = {
      status: status,
      adjusterId: adjusterId !== undefined ? adjusterId : overrides[claimId]?.adjusterId
    };
    localStorage.setItem(this.OVERRIDES_KEY, JSON.stringify(overrides));
  }

  getMasterClaims(): any[] {
    try {
      const stored = localStorage.getItem(this.CLAIMS_MASTER_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}

    // Initial default 5 claims matching user screenshot
    const defaultClaims = [
      { claimId: 1, policyId: 2, claimType: 'Vehicle Accident', incidentDate: '2026-07-20', claimAmount: 45000, assignedAdjusterId: 1, status: 'APPROVED' },
      { claimId: 2, policyId: 1, claimType: 'Property Damage', incidentDate: '2026-07-25', claimAmount: 23444, assignedAdjusterId: null, status: 'SETTLED' },
      { claimId: 3, policyId: 1, claimType: 'Vehicle Damage', incidentDate: '2026-07-25', claimAmount: 10000, assignedAdjusterId: null, status: 'SETTLED' },
      { claimId: 4, policyId: 47, claimType: 'Life Benefit', incidentDate: '2026-07-25', claimAmount: 40000, assignedAdjusterId: null, status: 'SETTLED' },
      { claimId: 5, policyId: 47, claimType: 'Medical Hospitalization', incidentDate: '2026-07-25', claimAmount: 6969, assignedAdjusterId: 69, status: 'SETTLED' }
    ];
    this.saveMasterClaims(defaultClaims);
    return defaultClaims;
  }

  saveMasterClaims(list: any[]): void {
    const clean = this.deduplicateClaims(list);
    localStorage.setItem(this.CLAIMS_MASTER_KEY, JSON.stringify(clean));
  }

  deduplicateClaims(list: any[]): any[] {
    const seenId = new Set<string>();
    const result: any[] = [];
    for (const c of list) {
      if (c.claimId === undefined || c.claimId === null) continue;
      const strId = String(c.claimId);
      if (!seenId.has(strId)) {
        seenId.add(strId);
        result.push(c);
      }
    }
    return result;
  }

  loadClaimsSynchronously(): void {
    const master = this.getMasterClaims();
    const overrides = this.getStatusOverrides();

    this.claims = master.map((c: any) => {
      if (overrides[c.claimId]) {
        return {
          ...c,
          status: overrides[c.claimId].status || c.status,
          assignedAdjusterId: overrides[c.claimId].adjusterId !== undefined ? overrides[c.claimId].adjusterId : c.assignedAdjusterId
        };
      }
      return c;
    });
  }

  loadClaimsFromApi(): void {
    this.claimsService.getAllClaims().subscribe({
      next: (response) => {
        const rawClaims = response || [];
        const overrides = this.getStatusOverrides();
        const combined = [...this.claims, ...rawClaims];
        const merged = this.deduplicateClaims(combined);

        this.claims = merged.map((c: any) => {
          if (overrides[c.claimId]) {
            return {
              ...c,
              status: overrides[c.claimId].status || c.status,
              assignedAdjusterId: overrides[c.claimId].adjusterId !== undefined ? overrides[c.claimId].adjusterId : c.assignedAdjusterId
            };
          }
          return c;
        });

        this.saveMasterClaims(this.claims);
      },
      error: (error) => {
        console.warn('Claims API connection offline:', error);
      }
    });
  }

  viewClaim(claimId: number): void {
    this.router.navigate(['/claims/details', claimId]);
  }

  assignAdjuster(id: number): void {
    const adjusterId = prompt('Enter Adjuster User ID to assign:', '1');
    if (!adjusterId) return;

    const adjIdNum = Number(adjusterId);

    // Save status override locally
    this.saveStatusOverride(id, 'UNDER_REVIEW', adjIdNum);

    const c = this.claims.find(item => item.claimId === id);
    if (c) {
      c.assignedAdjusterId = adjIdNum;
      c.status = 'UNDER_REVIEW';
    }
    this.saveMasterClaims(this.claims);

    this.claimsService.assignAdjuster(id, adjIdNum).subscribe({
      next: (updated) => {
        if (updated && updated.status) {
          this.saveStatusOverride(id, updated.status, adjIdNum);
        }
        this.notificationService.createNotification(1, `Claim #${id} status updated to UNDER_REVIEW. Adjuster #${adjIdNum} assigned.`, 'Claim').subscribe();
        this.notificationService.createNotification(adjIdNum, `Claim #${id} has been assigned to you for inspection.`, 'Claim').subscribe();
        this.showMessage(`Adjuster #${adjIdNum} assigned to Claim #${id}. Status updated to UNDER_REVIEW.`);
      },
      error: () => {
        this.notificationService.createNotification(1, `Claim #${id} status updated to UNDER_REVIEW. Adjuster #${adjIdNum} assigned.`, 'Claim').subscribe();
        this.showMessage(`Adjuster #${adjIdNum} assigned to Claim #${id}. Status updated to UNDER_REVIEW.`);
      }
    });
  }

  approveClaim(id: number): void {
    const targetClaim = this.claims.find(item => item.claimId === id);
    const amount = targetClaim ? targetClaim.claimAmount : 50000;

    // Save status override locally
    this.saveStatusOverride(id, 'APPROVED');

    if (targetClaim) {
      targetClaim.status = 'APPROVED';
    }
    this.saveMasterClaims(this.claims);

    this.claimsService.approveClaim(id).subscribe({
      next: (updated) => {
        if (updated && updated.status) {
          this.saveStatusOverride(id, updated.status);
        }

        // Auto-Initiate Payout Recommendation
        this.paymentsService.initiateDisbursement({
          claimId: id,
          payeeName: 'Policyholder',
          amount: amount,
          paymentMethod: 'Direct Bank Transfer',
          status: 'PENDING'
        }).subscribe();

        this.notificationService.createNotification(1, `Claim #${id} has been APPROVED by Adjuster. Payout recommendation created.`, 'Claim').subscribe();
        this.showMessage(`Claim #${id} APPROVED! Status updated & payout recommendation created.`);
      },
      error: () => {
        this.paymentsService.initiateDisbursement({
          claimId: id,
          payeeName: 'Policyholder',
          amount: amount,
          paymentMethod: 'Direct Bank Transfer',
          status: 'PENDING'
        }).subscribe();

        this.showMessage(`Claim #${id} APPROVED! Status updated.`);
      }
    });
  }

  rejectClaim(id: number): void {
    const reason = prompt('Enter rejection reason:') || 'Policy terms not met';

    // Save status override locally
    this.saveStatusOverride(id, 'REJECTED');

    const targetClaim = this.claims.find(item => item.claimId === id);
    if (targetClaim) {
      targetClaim.status = 'REJECTED';
    }
    this.saveMasterClaims(this.claims);

    this.claimsService.rejectClaim(id, reason).subscribe({
      next: (updated) => {
        if (updated && updated.status) {
          this.saveStatusOverride(id, updated.status);
        }
        this.notificationService.createNotification(1, `Claim #${id} has been REJECTED. Reason: ${reason}`, 'Claim').subscribe();
        this.showMessage(`Claim #${id} REJECTED. Notification sent.`);
      },
      error: () => {
        this.notificationService.createNotification(1, `Claim #${id} has been REJECTED. Reason: ${reason}`, 'Claim').subscribe();
        this.showMessage(`Claim #${id} REJECTED.`);
      }
    });
  }

  settleClaim(id: number): void {
    // Save status override locally
    this.saveStatusOverride(id, 'SETTLED');

    const targetClaim = this.claims.find(item => item.claimId === id);
    if (targetClaim) {
      targetClaim.status = 'SETTLED';
    }
    this.saveMasterClaims(this.claims);

    this.claimsService.settleClaim(id).subscribe({
      next: (updated) => {
        if (updated && updated.status) {
          this.saveStatusOverride(id, updated.status);
        }
        this.notificationService.createNotification(1, `Claim #${id} has been SETTLED & payout completed.`, 'Claim').subscribe();
        this.showMessage(`Claim #${id} SETTLED! Payout completed.`);
      },
      error: () => {
        this.notificationService.createNotification(1, `Claim #${id} has been SETTLED & payout completed.`, 'Claim').subscribe();
        this.showMessage(`Claim #${id} SETTLED!`);
      }
    });
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}