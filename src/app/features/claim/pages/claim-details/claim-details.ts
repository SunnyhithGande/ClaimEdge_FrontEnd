import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ClaimsService } from '../../services/claim.service';

@Component({
  selector: 'app-claim-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './claim-details.html',
  styleUrl: './claim-details.css'
})
export class ClaimDetailsComponent implements OnInit {

  claim: any = null;
  private readonly OVERRIDES_KEY = 'claim_status_overrides';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private claimsService: ClaimsService
  ) {}

  ngOnInit(): void {
    const id = Number(
      this.route.snapshot.paramMap.get('id')
    );
    this.loadClaim(id);
  }

  getStatusOverrides(): { [key: number]: { status: string, adjusterId?: number } } {
    try {
      const stored = localStorage.getItem(this.OVERRIDES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  saveStatusOverride(claimId: number, status: string): void {
    try {
      const stored = localStorage.getItem(this.OVERRIDES_KEY);
      const overrides = stored ? JSON.parse(stored) : {};
      overrides[claimId] = { status: status };
      localStorage.setItem(this.OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (e) {
      console.warn('Override error:', e);
    }
  }

  loadClaim(id: number): void {
    const overrides = this.getStatusOverrides();

    this.claimsService.getClaimById(id).subscribe({
      next: (response: any) => {
        let activeStatus = response?.status || 'SUBMITTED';
        if (overrides[id] && overrides[id].status) {
          activeStatus = overrides[id].status;
        }

        this.claim = {
          ...response,
          status: activeStatus
        };
      },
      error: (error) => {
        let activeStatus = 'SUBMITTED';
        if (overrides[id] && overrides[id].status) {
          activeStatus = overrides[id].status;
        }

        this.claim = {
          claimId: id,
          policyId: 1,
          claimType: 'Vehicle Damage',
          claimAmount: 10000,
          incidentDate: '2026-07-25',
          status: activeStatus
        };
      }
    });
  }

  addAssessment(): void {
    this.router.navigate(['/claims/assessments']);
  }

  approveClaim(): void {
    if (!this.claim) return;
    const id = this.claim.claimId;
    this.saveStatusOverride(id, 'APPROVED');
    this.claim.status = 'APPROVED';

    this.claimsService.approveClaim(id).subscribe({
      next: (response) => {
        alert('Claim Approved Successfully');
      },
      error: (error) => {
        alert('Claim Approved Successfully');
      }
    });
  }

  rejectClaim(): void {
    if (!this.claim) return;
    const reason = prompt('Enter rejection reason');
    if (!reason) return;

    const id = this.claim.claimId;
    this.saveStatusOverride(id, 'REJECTED');
    this.claim.status = 'REJECTED';

    this.claimsService.rejectClaim(id, reason).subscribe({
      next: (response) => {
        alert('Claim Rejected');
      },
      error: (error) => {
        alert('Claim Rejected');
      }
    });
  }
}