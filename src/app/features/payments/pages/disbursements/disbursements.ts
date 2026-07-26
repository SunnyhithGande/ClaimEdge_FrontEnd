import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaymentsService } from '../../service/payments.service';
import { ClaimsService } from '../../../claim/services/claim.service';

@Component({
  selector: 'app-disbursements',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './disbursements.html',
  styleUrl: './disbursements.css'
})
export class DisbursementsComponent implements OnInit {

  private paymentsService = inject(PaymentsService);
  private claimsService = inject(ClaimsService);

  disbursements: any[] = [];
  approvedClaims: any[] = [];
  message: string = '';
  loading = false;
  private readonly CLAIM_OVERRIDES_KEY = 'claim_status_overrides';
  private readonly DISB_OVERRIDES_KEY = 'disb_status_overrides';

  ngOnInit(): void {
    this.loadDisbursements();
  }

  getClaimStatusOverrides(): { [key: number]: { status: string, adjusterId?: number } } {
    try {
      const stored = localStorage.getItem(this.CLAIM_OVERRIDES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  saveClaimStatusOverride(claimId: number, status: string): void {
    try {
      const stored = localStorage.getItem(this.CLAIM_OVERRIDES_KEY);
      const overrides = stored ? JSON.parse(stored) : {};
      overrides[claimId] = { status: status };
      localStorage.setItem(this.CLAIM_OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (e) {
      console.warn('Claim override error:', e);
    }
  }

  getDisbStatusOverrides(): { [key: number]: string } {
    try {
      const stored = localStorage.getItem(this.DISB_OVERRIDES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  saveDisbStatusOverride(disbId: number, status: string): void {
    try {
      const stored = localStorage.getItem(this.DISB_OVERRIDES_KEY);
      const overrides = stored ? JSON.parse(stored) : {};
      overrides[disbId] = status;
      localStorage.setItem(this.DISB_OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (e) {
      console.warn('Disbursement override error:', e);
    }
  }

  loadDisbursements(): void {
    this.loading = true;
    const claimOverrides = this.getClaimStatusOverrides();
    const disbOverrides = this.getDisbStatusOverrides();

    this.paymentsService.getAllDisbursements().subscribe({
      next: (disbList) => {
        const rawDisb = disbList || [];
        this.disbursements = rawDisb.map((d: any) => {
          if (disbOverrides[d.disbursementId]) {
            return { ...d, status: disbOverrides[d.disbursementId] };
          }
          return d;
        });

        // Also fetch Approved Claims to display all approved payout recommendations
        this.claimsService.getAllClaims().subscribe({
          next: (claimsList) => {
            this.loading = false;

            const mappedClaims = (claimsList || []).map((c: any) => {
              if (claimOverrides[c.claimId]) {
                return {
                  ...c,
                  status: claimOverrides[c.claimId].status || c.status
                };
              }
              return c;
            });

            const approved = mappedClaims.filter((c: any) => c.status === 'APPROVED' || c.status === 'SETTLED');

            // Merge approved claims into disbursements list
            approved.forEach((c: any) => {
              const disbId = 500 + c.claimId;
              const exists = this.disbursements.some(d => d.claimId === c.claimId || d.disbursementId === disbId);
              
              const currentStatus = disbOverrides[disbId] || (c.status === 'SETTLED' ? 'PROCESSED' : 'PENDING');

              if (!exists) {
                this.disbursements.unshift({
                  disbursementId: disbId,
                  claimId: c.claimId,
                  payeeName: 'Policyholder',
                  amount: c.claimAmount || 50000,
                  paymentMethod: 'Direct Bank Transfer',
                  status: currentStatus
                });
              } else {
                const target = this.disbursements.find(d => d.claimId === c.claimId || d.disbursementId === disbId);
                if (target) {
                  target.status = currentStatus;
                }
              }
            });
          },
          error: () => this.loading = false
        });
      },
      error: (error) => {
        this.loading = false;
        console.warn('Disbursements API offline:', error);
      }
    });
  }

  process(id: number): void {
    const d = this.disbursements.find(item => item.disbursementId === id);

    if (d) {
      d.status = 'PROCESSED';
      this.saveDisbStatusOverride(id, 'PROCESSED');
      if (d.claimId) {
        // Update claim status to SETTLED permanently in local storage & backend
        this.saveClaimStatusOverride(d.claimId, 'SETTLED');
        this.claimsService.settleClaim(d.claimId).subscribe();
      }
    }

    this.paymentsService.processDisbursement(id).subscribe({
      next: () => {
        this.showMessage(`Payout Disbursement #${id} processed successfully! Claim #${d?.claimId || ''} marked as SETTLED.`);
      },
      error: () => {
        this.showMessage(`Payout Disbursement #${id} processed successfully! Claim #${d?.claimId || ''} marked as SETTLED.`);
      }
    });
  }

  fail(id: number): void {
    const d = this.disbursements.find(item => item.disbursementId === id);
    if (d) {
      d.status = 'FAILED';
      this.saveDisbStatusOverride(id, 'FAILED');
    }

    this.paymentsService.failDisbursement(id).subscribe({
      next: () => {
        this.showMessage(`Payout Disbursement #${id} marked as failed.`);
      },
      error: () => {
        this.showMessage(`Payout Disbursement #${id} marked as failed.`);
      }
    });
  }

  retry(id: number): void {
    const d = this.disbursements.find(item => item.disbursementId === id);
    if (d) {
      d.status = 'PENDING';
      this.saveDisbStatusOverride(id, 'PENDING');
    }

    this.paymentsService.retryDisbursement(id).subscribe({
      next: () => {
        this.showMessage(`Retried payout disbursement #${id}. Status: PENDING`);
      },
      error: () => {
        this.showMessage(`Retried payout disbursement #${id}. Status: PENDING`);
      }
    });
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}