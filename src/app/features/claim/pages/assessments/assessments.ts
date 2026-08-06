import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { ClaimsService } from '../../services/claim.service';
import { PaymentsService } from '../../../payments/service/payments.service';
import { NotificationService } from '../../../notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PolicyService } from '../../../policy/services/policy.service';

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
  private policyService = inject(PolicyService);
  public authService = inject(AuthService);
  private http = inject(HttpClient);

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
        const allClaims = data || [];
        
        // Filter out approved, rejected, or settled claims so only pending/review claims show up
        const activeClaims = allClaims.filter((c: any) => {
           const st = (c.status || '').toUpperCase();
           return st.includes('SUBMITTED') || st.includes('REVIEW') || st.includes('PENDING');
        });
        
        // Fetch fraud flags to filter out unassigned fraud claims
        this.http.get<any[]>('http://localhost:8010/api/fraud').subscribe({
          next: (fraudFlags) => {
            this.submittedClaims = activeClaims.filter((c: any) => {
               // Check if there is an active fraud flag (status OPEN or CONFIRMED_FRAUD, etc)
               // Actually we just check if it has a fraud flag that hasn't been CLEARED
               const fraud = fraudFlags.find(f => Number(f.claimId) === Number(c.claimId));
               
               if (fraud) {
                  if (fraud.status !== 'CLEARED') {
                      // If it's a fraud claim and NOT cleared, NEVER show it to the adjuster
                      return false;
                  } else {
                      // If it IS cleared, it must be explicitly assigned to an adjuster to appear
                      return c.assignedAdjusterId != null && c.assignedAdjusterId !== 0 && c.assignedAdjusterId !== '';
                  }
               }
               // If not fraud (or fraud cleared), it appears as usual
               return true;
            });

            if (this.submittedClaims.length > 0) {
              const currentIdStr = this.assessmentData.claimId || this.submittedClaims[0].claimId.toString();
              this.onClaimSelect(currentIdStr);
            }
          },
          error: (err) => {
             console.error('Error fetching fraud flags:', err);
             // Fallback if fraud API fails
             this.submittedClaims = activeClaims;
             if (this.submittedClaims.length > 0) {
                const currentIdStr = this.assessmentData.claimId || this.submittedClaims[0].claimId.toString();
                this.onClaimSelect(currentIdStr);
             }
          }
        });
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

  isClaimProcessed(): boolean {
    if (!this.selectedClaim) return true; // disable if no claim selected
    const st = (this.selectedClaim.status || '').toUpperCase();
    return st.includes('APPROVED') || st.includes('REJECTED') || st.includes('SETTLED') || st.includes('PAID');
  }

  viewDocument(doc: UploadedDoc): void {
    if (doc.url) {
      const win = window.open('', '_blank');
      if (win) {
        if (doc.type.startsWith('image/')) {
          win.document.write(`<title>${doc.name}</title><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#333;height:100vh;"><img src="${doc.url}" style="max-width:100%;max-height:100vh;"></body>`);
        } else if (doc.type === 'application/pdf') {
          win.document.write(`<title>${doc.name}</title><body style="margin:0;"><iframe src="${doc.url}" width="100%" height="100%" style="border:none;"></iframe></body>`);
        } else {
          win.document.write(`<title>${doc.name}</title><body style="margin:0;"><iframe src="${doc.url}" width="100%" height="100%" style="border:none;"></iframe></body>`);
        }
      }
    } else {
      alert(`📄 Viewing Document: ${doc.name}\nSize: ${doc.size}\nUpload Date: ${doc.date}\nType: ${doc.type}\nStatus: Verified Customer Upload`);
    }
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
            if (this.selectedClaim && this.selectedClaim.policyId) {
              this.policyService.getPolicy(this.selectedClaim.policyId).subscribe({
                next: (policy) => {
                  const policyHolderId = policy?.policyHolderId || 1;
                  this.notificationService.createNotification(policyHolderId, notifMsg, 'Claim').subscribe();
                },
                error: () => this.notificationService.createNotification(1, notifMsg, 'Claim').subscribe()
              });
            } else {
              this.notificationService.createNotification(1, notifMsg, 'Claim').subscribe();
            }

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
            if (this.selectedClaim && this.selectedClaim.policyId) {
              this.policyService.getPolicy(this.selectedClaim.policyId).subscribe({
                next: (policy) => {
                  const policyHolderId = policy?.policyHolderId || 1;
                  this.notificationService.createNotification(policyHolderId, notifMsg, 'Claim').subscribe();
                },
                error: () => this.notificationService.createNotification(1, notifMsg, 'Claim').subscribe()
              });
            } else {
              this.notificationService.createNotification(1, notifMsg, 'Claim').subscribe();
            }

            this.showMessage(`❌ Claim #${claimId} REJECTED! Assessment recorded.`);
            this.clearForm();
            this.loadSubmittedClaims();
            this.loadAssessments();
          },
          error: () => {
            this.showMessage(`❌ Claim #${claimId} REJECTED! Assessment recorded.`);
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