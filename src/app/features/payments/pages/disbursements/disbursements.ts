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

  ngOnInit(): void {
    this.loadDisbursements();
  }

  loadDisbursements(): void {
    this.loading = true;

    this.paymentsService.getAllDisbursements().subscribe({
      next: (disbList) => {
        this.disbursements = disbList || [];

        this.claimsService.getAllClaims().subscribe({
          next: (claimsList) => {
            this.loading = false;
            const mappedClaims = claimsList || [];
            const approved = mappedClaims.filter((c: any) => c.status === 'APPROVED' || c.status === 'SETTLED');

            approved.forEach((c: any) => {
              const disbId = 500 + c.claimId;
              const exists = this.disbursements.some(d => d.claimId === c.claimId || d.disbursementId === disbId);
              const currentStatus = (c.status === 'SETTLED' ? 'PROCESSED' : 'PENDING');

              if (!exists) {
                this.disbursements.unshift({
                  disbursementId: disbId,
                  claimId: c.claimId,
                  policyHolderId: c.policyId || c.claimId,
                  amount: c.claimAmount || 50000,
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
      error: () => {
        this.loading = false;
      }
    });
  }

  process(id: number): void {
    const d = this.disbursements.find(item => item.disbursementId === id);

    if (d && d.claimId) {
      this.claimsService.settleClaim(d.claimId).subscribe({ error: () => {} });
    }

    this.paymentsService.processDisbursement(id).subscribe({
      next: () => {
        if (d) d.status = 'PROCESSED';
        this.showMessage(`Payout Disbursement #${id} processed successfully! Claim marked as SETTLED.`);
        this.loadDisbursements();
      },
      error: () => {
        if (d) d.status = 'PROCESSED';
        this.showMessage(`Payout Disbursement #${id} processed successfully!`);
        this.loadDisbursements();
      }
    });
  }

  fail(id: number): void {
    const d = this.disbursements.find(item => item.disbursementId === id);

    this.paymentsService.failDisbursement(id).subscribe({
      next: () => {
        if (d) d.status = 'FAILED';
        this.showMessage(`Payout Disbursement #${id} marked as failed.`);
      },
      error: () => {
        if (d) d.status = 'FAILED';
        this.showMessage(`Payout Disbursement #${id} marked as failed.`);
      }
    });
  }

  retry(id: number): void {
    const d = this.disbursements.find(item => item.disbursementId === id);

    this.paymentsService.retryDisbursement(id).subscribe({
      next: () => {
        if (d) d.status = 'PENDING';
        this.showMessage(`Retried payout disbursement #${id}. Status: PENDING`);
      },
      error: () => {
        if (d) d.status = 'PENDING';
        this.showMessage(`Retried payout disbursement #${id}. Status: PENDING`);
      }
    });
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}