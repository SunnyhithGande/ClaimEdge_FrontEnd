import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ClaimsService } from '../../../claim/services/claim.service';

interface FraudFlag {
  flagId: number;
  claimId: number;
  fraudType: string;
  severity: string;
  status: string;
  description?: string;
  createdAt?: string;
}

interface ClaimItem {
  claimId: number;
  policyId: number;
  claimType: string;
  claimAmount: number;
  incidentDate: string;
  status: string;
  fraudFlag?: FraudFlag;
  assignAdjusterId?: string;
}

@Component({
  selector: 'app-fraud-detection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fraud-detection.html',
  styleUrl: './fraud-detection.css'
})
export class FraudDetectionComponent implements OnInit {

  private http = inject(HttpClient);
  private claimsService = inject(ClaimsService);

  claims: ClaimItem[] = [];
  loading = true;
  message = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.claimsService.getAllClaims().subscribe({
      next: (allClaims: any[]) => {
        // Filter only submitted claims or claims that have a fraud flag that we are tracking
        // Actually, we should show claims that are SUBMITTED, and maybe UNDER_REVIEW if they were assigned
        // The requirement says: "Every submitted claim should initially have Fraud Status OPEN..."
        const submittedClaims = allClaims.filter(c => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW');
        
        this.http.get<FraudFlag[]>('http://localhost:8010/api/fraud').subscribe({
          next: (flags) => {
            this.claims = submittedClaims.map(c => {
              const flag = flags.find(f => f.claimId === c.claimId);
              return {
                ...c,
                fraudFlag: flag,
                assignAdjusterId: ''
              };
            }).filter(c => c.fraudFlag != null); // Only show those with fraud flags
            this.loading = false;
          },
          error: (err) => {
            console.error('Failed to load fraud flags', err);
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Failed to load claims', err);
        this.loading = false;
      }
    });
  }
  private router = inject(Router);

  investigate(claim: ClaimItem): void {
    if (!claim.fraudFlag) return;
    this.router.navigate(['/compliance/fraud-investigation', claim.fraudFlag.flagId]);
  }

  clearFlag(claim: ClaimItem): void {
    if (!claim.fraudFlag) return;
    this.http.put<FraudFlag>(`http://localhost:8010/api/fraud/${claim.fraudFlag.flagId}/clear`, null, {
      params: { clearedBy: 'COMPLIANCE_ANALYST' }
    }).subscribe({
      next: (updatedFlag) => {
        claim.fraudFlag = updatedFlag;
        this.showMessage('Fraud flag cleared successfully.');
      },
      error: (err) => {
        console.error('Clear failed', err);
        this.showMessage('Failed to clear fraud flag.');
      }
    });
  }

  assignAdjuster(claim: ClaimItem): void {
    if (!claim.assignAdjusterId) {
      alert('Please enter an Adjuster ID.');
      return;
    }
    const adjusterId = Number(claim.assignAdjusterId);
    
    this.claimsService.assignAdjuster(claim.claimId, adjusterId).subscribe({
      next: (updatedClaim: any) => {
        claim.status = updatedClaim.status;
        this.showMessage('Adjuster assigned successfully.');
      },
      error: (err) => {
        console.error('Assign adjuster failed', err);
        alert('Failed to assign adjuster.');
      }
    });
  }

  private showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => {
      this.message = '';
    }, 4000);
  }

  getFraudStatusBadgeClass(status: string): string {
    if (status === 'OPEN') return 'bg-danger';
    if (status === 'INVESTIGATED') return 'bg-warning text-dark';
    if (status === 'CONFIRMED_FRAUD') return 'bg-dark text-white';
    if (status === 'CLEARED') return 'bg-success';
    return 'bg-secondary';
  }
}
