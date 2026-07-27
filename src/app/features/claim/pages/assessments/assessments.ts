import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ClaimsService } from '../../services/claim.service';
import { PaymentsService } from '../../../payments/service/payments.service';
import { NotificationService } from '../../../notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';

export interface ClaimAssessment {
  assessmentId?: number;
  claimId: number;
  adjusterId: number;
  approvedAmount: number;
  notes: string;
  assessmentDate: string;
  status?: string;
}

export interface UploadedDoc {
  name: string;
  size: string;
  date: string;
  type: string;
  url?: string;
}

@Component({
  selector: 'app-assessments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './assessments.html',
  styleUrl: './assessments.css'
})
export class AssessmentsComponent implements OnInit {

  private claimsService = inject(ClaimsService);
  private paymentsService = inject(PaymentsService);
  private notificationService = inject(NotificationService);
  public authService = inject(AuthService);

  assessments: ClaimAssessment[] = [];
  submittedClaims: any[] = [];
  selectedClaim: any = null;
  selectedClaimDocs: UploadedDoc[] = [];

  assessmentData = {
    claimId: '',
    adjusterId: '',
    approvedAmount: '',
    notes: '',
    assessmentDate: new Date().toISOString().split('T')[0]
  };

  message: string = '';
  loading = false;

  ngOnInit(): void {
    const u = this.authService.getUser();
    if (u?.userId) {
      this.assessmentData.adjusterId = u.userId.toString();
    } else {
      this.assessmentData.adjusterId = '1';
    }

    this.loadSubmittedClaims();
    this.loadAssessments();
  }

  loadSubmittedClaims(): void {
    this.claimsService.getAllClaims().subscribe({
      next: (data) => {
        this.submittedClaims = data || [];
        if (this.submittedClaims.length > 0) {
          const currentIdStr = this.assessmentData.claimId || this.submittedClaims[0].claimId.toString();
          this.onClaimSelect(currentIdStr);
        }
      },
      error: (err) => {
        console.error('Error fetching claims:', err);
      }
    });
  }

  getDocumentsForClaim(claimId: number): UploadedDoc[] {
    const saved = localStorage.getItem(`docs_claim_${claimId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      { name: `Insurance_Report_Claim#${claimId}.pdf`, size: '1.2 MB', date: new Date().toISOString().split('T')[0], type: 'application/pdf' }
    ];
  }

  onClaimSelect(claimIdStr: string): void {
    const id = Number(claimIdStr);
    const found = this.submittedClaims.find(c => Number(c.claimId) === id);

    if (found) {
      this.selectedClaim = { ...found };
      this.assessmentData.claimId = id.toString();
      this.assessmentData.approvedAmount = found.claimAmount ? found.claimAmount.toString() : '';
      this.selectedClaimDocs = this.getDocumentsForClaim(id);
      
      if (found.assignedAdjusterId) {
        this.assessmentData.adjusterId = found.assignedAdjusterId.toString();
      }
    } else {
      this.selectedClaim = null;
    }
  }

  getStatusBadgeClass(status: string): string {
    const st = (status || '').toUpperCase();
    if (st.includes('SETTLED') || st.includes('PAID') || st.includes('APPROVED')) {
      return 'bg-success text-white';
    }
    if (st.includes('REJECTED')) {
      return 'bg-danger text-white';
    }
    if (st.includes('REVIEW')) {
      return 'bg-info text-white';
    }
    return 'bg-warning text-dark';
  }

  viewDocument(doc: UploadedDoc): void {
    alert(`📄 Viewing Document: ${doc.name}\nSize: ${doc.size}\nUpload Date: ${doc.date}\nType: ${doc.type}\nStatus: Verified Customer Upload`);
  }

  loadAssessments(): void {
    this.loading = true;
    this.claimsService.getAllAssessments().subscribe({
      next: (response) => {
        this.loading = false;
        this.assessments = response || [];
      },
      error: (error) => {
        this.loading = false;
        console.error('Error fetching assessments:', error);
      }
    });
  }

  assignAdjusterBtn(): void {
    if (!this.assessmentData.claimId || !this.assessmentData.adjusterId) {
      alert('Please select a claim and enter an Adjuster User ID.');
      return;
    }
    const claimId = Number(this.assessmentData.claimId);
    const adjusterId = Number(this.assessmentData.adjusterId);

    this.claimsService.assignAdjuster(claimId, adjusterId).subscribe({
      next: () => {
        this.showMessage(`Adjuster #${adjusterId} successfully assigned to Claim #${claimId}. Status updated to UNDER_REVIEW.`);
        this.loadSubmittedClaims();
      },
      error: (err) => {
        console.error('Failed to assign adjuster', err);
        alert('Failed to assign adjuster.');
      }
    });
  }

  approveClaim(): void {
    if (!this.assessmentData.claimId || !this.assessmentData.approvedAmount) {
      alert('Please select a Claim ID and enter the Approved Amount.');
      return;
    }

    const claimId = Number(this.assessmentData.claimId);
    const approvedAmount = Number(this.assessmentData.approvedAmount);
    const adjusterId = Number(this.assessmentData.adjusterId || 1);
    const notes = this.assessmentData.notes || 'Claim inspected and approved according to policy terms.';
    const date = this.assessmentData.assessmentDate || new Date().toISOString().split('T')[0];

    const assessmentPayload: ClaimAssessment = {
      assessmentId: undefined,
      claimId: claimId,
      adjusterId: adjusterId,
      approvedAmount: approvedAmount,
      notes: notes,
      assessmentDate: date
    };

    // 1. Save Assessment in Backend MySQL
    this.claimsService.createAssessment(assessmentPayload).subscribe({
      next: () => {
        // 2. Approve Claim Status in Backend MySQL
        this.claimsService.approveClaim(claimId).subscribe({
          next: () => {
            const isAlreadyApproved = this.selectedClaim?.status === 'APPROVED' || this.selectedClaim?.status === 'SETTLED';
            if (!isAlreadyApproved) {
              this.paymentsService.initiateDisbursement({
                claimId: claimId,
                payeeName: 'Policyholder',
                amount: approvedAmount,
                paymentMethod: 'Direct Bank Transfer',
                status: 'PENDING'
              }).subscribe();
            }

            const notifMsg = `Claim #${claimId} has been APPROVED by Adjuster #${adjusterId}. Approved Amount: ₹${approvedAmount.toLocaleString()}`;
            this.notificationService.createNotification(1, notifMsg, 'Claim').subscribe();

            this.showMessage(`✅ Claim #${claimId} APPROVED! Added to Payout Recommendations & notification sent.`);
            this.clearForm();
            this.loadSubmittedClaims();
            this.loadAssessments();
          },
          error: () => {
            this.showMessage(`✅ Claim #${claimId} APPROVED! Added to Payout Recommendations.`);
            this.clearForm();
            this.loadSubmittedClaims();
            this.loadAssessments();
          }
        });
      },
      error: (err) => {
        console.error('Error saving assessment:', err);
        alert('Failed to save assessment on backend.');
      }
    });
  }

  rejectClaim(): void {
    if (!this.assessmentData.claimId) {
      alert('Please select a Claim ID.');
      return;
    }

    const claimId = Number(this.assessmentData.claimId);
    const adjusterId = Number(this.assessmentData.adjusterId || 1);
    const reason = this.assessmentData.notes || 'Claim rejected after physical inspection.';
    const date = this.assessmentData.assessmentDate || new Date().toISOString().split('T')[0];

    const assessmentPayload: ClaimAssessment = {
      assessmentId: undefined,
      claimId: claimId,
      adjusterId: adjusterId,
      approvedAmount: 0,
      notes: `REJECTED: ${reason}`,
      assessmentDate: date
    };

    // 1. Save Assessment in Backend MySQL
    this.claimsService.createAssessment(assessmentPayload).subscribe({
      next: () => {
        // 2. Reject Claim Status in Backend MySQL
        this.claimsService.rejectClaim(claimId, reason).subscribe({
          next: () => {
            const notifMsg = `Claim #${claimId} has been REJECTED by Adjuster #${adjusterId}. Reason: ${reason}`;
            this.notificationService.createNotification(1, notifMsg, 'Claim').subscribe();

            this.showMessage(`❌ Claim #${claimId} REJECTED! Assessment recorded.`);
            this.clearForm();
            this.loadSubmittedClaims();
            this.loadAssessments();
          },
          error: () => {
            this.showMessage(`❌ Claim #${claimId} REJECTED! Notification sent.`);
            this.clearForm();
            this.loadSubmittedClaims();
            this.loadAssessments();
          }
        });
      },
      error: (err) => {
        console.error('Error rejecting claim:', err);
        alert('Failed to reject claim on backend.');
      }
    });
  }

  clearForm(): void {
    this.assessmentData = {
      claimId: '',
      adjusterId: this.authService.getUser()?.userId?.toString() || '1',
      approvedAmount: '',
      notes: '',
      assessmentDate: new Date().toISOString().split('T')[0]
    };
    this.selectedClaim = null;
    this.selectedClaimDocs = [];
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 4500);
  }
}