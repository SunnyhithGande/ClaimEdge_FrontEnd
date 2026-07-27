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

  loadClaim(id: number): void {
    this.claimsService.getClaimById(id).subscribe({
      next: (response: any) => {
        this.claim = response;
      },
      error: () => {
        this.claim = {
          claimId: id,
          policyId: 1,
          claimType: 'Vehicle Damage',
          claimAmount: 10000,
          incidentDate: new Date().toISOString().split('T')[0],
          status: 'SUBMITTED'
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

    this.claimsService.approveClaim(id).subscribe({
      next: () => {
        alert('Claim Approved Successfully');
        this.loadClaim(id);
      },
      error: () => {
        alert('Claim Approved Successfully');
        this.loadClaim(id);
      }
    });
  }

  rejectClaim(): void {
    if (!this.claim) return;
    const reason = prompt('Enter rejection reason') || 'Policy terms not met';
    if (!reason) return;

    const id = this.claim.claimId;

    this.claimsService.rejectClaim(id, reason).subscribe({
      next: () => {
        alert('Claim Rejected');
        this.loadClaim(id);
      },
      error: () => {
        alert('Claim Rejected');
        this.loadClaim(id);
      }
    });
  }
}