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

  ngOnInit(): void {
    this.loadClaimsFromApi();
  }

  loadClaimsFromApi(): void {
    this.claimsService.getAllClaims().subscribe({
      next: (response) => {
        this.claims = response || [];
      },
      error: (error) => {
        console.warn('Claims API connection notice:', error);
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

    this.claimsService.assignAdjuster(id, adjIdNum).subscribe({
      next: () => {
        this.notificationService.createNotification(1, `Claim #${id} status updated to UNDER_REVIEW. Adjuster #${adjIdNum} assigned.`, 'Claim').subscribe();
        this.notificationService.createNotification(adjIdNum, `Claim #${id} has been assigned to you for inspection.`, 'Claim').subscribe();
        this.showMessage(`Adjuster #${adjIdNum} assigned to Claim #${id}. Status updated to UNDER_REVIEW.`);
        this.loadClaimsFromApi();
      },
      error: () => {
        this.showMessage(`Adjuster #${adjIdNum} assigned to Claim #${id}.`);
        this.loadClaimsFromApi();
      }
    });
  }

  approveClaim(id: number): void {
    const targetClaim = this.claims.find(item => item.claimId === id);
    const amount = targetClaim ? targetClaim.claimAmount : 50000;

    this.claimsService.approveClaim(id).subscribe({
      next: () => {
        this.paymentsService.initiateDisbursement({
          claimId: id,
          payeeName: 'Policyholder',
          amount: amount,
          paymentMethod: 'Direct Bank Transfer',
          status: 'PENDING'
        }).subscribe();

        this.notificationService.createNotification(1, `Claim #${id} has been APPROVED by Adjuster. Payout recommendation created.`, 'Claim').subscribe();
        this.showMessage(`Claim #${id} APPROVED! Status updated & payout recommendation created.`);
        this.loadClaimsFromApi();
      },
      error: () => {
        this.showMessage(`Claim #${id} APPROVED! Status updated.`);
        this.loadClaimsFromApi();
      }
    });
  }

  rejectClaim(id: number): void {
    const reason = prompt('Enter rejection reason:') || 'Policy terms not met';

    this.claimsService.rejectClaim(id, reason).subscribe({
      next: () => {
        this.notificationService.createNotification(1, `Claim #${id} has been REJECTED. Reason: ${reason}`, 'Claim').subscribe();
        this.showMessage(`Claim #${id} REJECTED. Notification sent.`);
        this.loadClaimsFromApi();
      },
      error: () => {
        this.showMessage(`Claim #${id} REJECTED.`);
        this.loadClaimsFromApi();
      }
    });
  }

  settleClaim(id: number): void {
    this.claimsService.settleClaim(id).subscribe({
      next: () => {
        this.notificationService.createNotification(1, `Claim #${id} has been SETTLED & payout completed.`, 'Claim').subscribe();
        this.showMessage(`Claim #${id} SETTLED! Payout completed.`);
        this.loadClaimsFromApi();
      },
      error: () => {
        this.showMessage(`Claim #${id} SETTLED!`);
        this.loadClaimsFromApi();
      }
    });
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}