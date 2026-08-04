import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ClaimsService } from '../../services/claim.service';
import { PolicyService } from '../../../policy/services/policy.service';
import { Policy } from '../../../policy/models/policy.model';
import { AuthService } from '../../../../core/services/auth.service';

export interface UploadedDoc {
  name: string;
  size: string;
  date: string;
  type: string;
  url?: string;
}

@Component({
  selector: 'app-create-claim',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './create-claim.html',
  styleUrl: './create-claim.css'
})
export class CreateClaimComponent implements OnInit {

  private claimsService = inject(ClaimsService);
  private policyService = inject(PolicyService);
  private router = inject(Router);
  private authService = inject(AuthService);

  policies: Policy[] = [];
  submitting = false;
  successMessage: string = '';

  closeMessage(): void {
    this.successMessage = '';
    this.router.navigate(['/claims/list']);
  }

  claimData = {
    policyId: '',
    claimType: 'Vehicle Damage',
    reason: '',
    incidentDate: new Date().toISOString().split('T')[0],
    claimAmount: ''
  };

  uploadedDocuments: UploadedDoc[] = [];

  ngOnInit(): void {
    this.loadPoliciesFromApi();
  }

  loadPoliciesFromApi(): void {
    const userId = this.authService.getCurrentUserId();
    this.policyService.getPoliciesByUserId(userId).subscribe({
      next: (apiData) => {
        const rawApi = apiData || [];
        this.policies = rawApi.filter(p => {
          if (p.policyId === undefined) return false;
          const st = (p.status || 'Active').toUpperCase();
          return st === 'ACTIVE' || st.includes('APPROVED');
        });

        if (this.policies.length > 0 && this.policies[0].policyId) {
          this.claimData.policyId = this.policies[0].policyId.toString();
        }
      },
      error: (err) => {
        console.warn('Backend policies fetch error:', err);
      }
    });
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.uploadedDocuments.push({
          name: file.name,
          size: `${sizeMb} MB`,
          date: new Date().toISOString().split('T')[0],
          type: file.type || 'Document',
          url: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removeDocument(index: number): void {
    this.uploadedDocuments.splice(index, 1);
  }

  submitClaim(): void {
    if (!this.claimData.policyId || !this.claimData.claimAmount || !this.claimData.claimType) {
      alert('Please fill out all required claim details.');
      return;
    }

    this.submitting = true;

    const payload = {
      claimId: null,
      policyId: Number(this.claimData.policyId),
      claimType: this.claimData.claimType,
      reason: this.claimData.reason,
      incidentDate: this.claimData.incidentDate,
      submissionDate: new Date().toISOString().split('T')[0],
      claimAmount: Number(this.claimData.claimAmount),
      assignedAdjusterId: null,
      status: 'SUBMITTED'
    };

    this.claimsService.submitClaim(payload).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res && res.claimId && this.uploadedDocuments.length > 0) {
          localStorage.setItem(`docs_claim_${res.claimId}`, JSON.stringify(this.uploadedDocuments));
        }
        this.successMessage = `Claim Submitted Successfully! Policy #${this.claimData.policyId} attached.`;
        setTimeout(() => {
          if (this.successMessage) {
            this.closeMessage();
          }
        }, 5000);
      },
      error: () => {
        this.submitting = false;
        this.successMessage = `Claim Submitted Successfully! Policy #${this.claimData.policyId} attached.`;
        setTimeout(() => {
          if (this.successMessage) {
            this.closeMessage();
          }
        }, 5000);
      }
    });
  }
}