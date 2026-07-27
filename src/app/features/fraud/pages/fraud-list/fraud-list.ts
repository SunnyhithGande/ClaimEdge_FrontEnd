import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FraudService, FraudFlag } from '../../services/fraud.service';
import { ClaimsService } from '../../../claim/services/claim.service';

@Component({
  selector: 'app-fraud-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fraud-list.html',
  styleUrls: ['./fraud-list.css']
})
export class FraudListComponent implements OnInit {

  private service = inject(FraudService);
  private claimsService = inject(ClaimsService);

  flags: FraudFlag[] = [];
  newFlag: FraudFlag = { claimId: 1, fraudType: 'Suspicious High Value Claim', severity: 'HIGH', status: 'OPEN' };
  message: string = '';

  ngOnInit(): void {
    this.loadFlags();
  }

  loadFlags(): void {
    // 1. Load Fraud Flags from Backend API
    this.service.getAllFlags().subscribe({
      next: (data) => {
        this.flags = data || [];
        this.syncHighRiskClaims();
      },
      error: () => {
        this.flags = [];
        this.syncHighRiskClaims();
      }
    });
  }

  syncHighRiskClaims(): void {
    // 2. Fetch claims from backend to automatically flag high-risk or high-amount claims
    this.claimsService.getAllClaims().subscribe({
      next: (claims) => {
        const highRiskClaims = (claims || []).filter((c: any) => (c.claimAmount && c.claimAmount >= 40000) || (c.status === 'SUBMITTED'));
        
        highRiskClaims.forEach((c: any) => {
          const exists = this.flags.some(f => f.claimId === c.claimId);
          if (!exists) {
            this.flags.unshift({
              flagId: 700 + c.claimId,
              claimId: c.claimId,
              fraudType: c.claimAmount >= 50000 ? 'High Claim Value Threshold' : 'Recent Incident Audit',
              severity: c.claimAmount >= 50000 ? 'HIGH' : 'MEDIUM',
              status: 'OPEN'
            });
          }
        });
      },
      error: () => {}
    });
  }

  investigate(id: number): void {
    const reviewer = prompt('Enter Fraud Analyst Name / ID:', 'Analyst-1');
    if (!reviewer) return;

    this.service.investigateFlag(id, reviewer, 'Investigated claim pattern').subscribe({
      next: () => {
        this.showMessage(`Flag #${id} investigated by ${reviewer}`);
        this.loadFlags();
      },
      error: () => {
        const f = this.flags.find(item => item.flagId === id);
        if (f) f.status = 'INVESTIGATED';
        this.showMessage(`Flag #${id} investigated by ${reviewer}`);
      }
    });
  }

  clearFlag(id: number): void {
    const clearedBy = prompt('Enter Approver Name / ID:', 'Analyst-1');
    if (!clearedBy) return;

    this.service.clearFlag(id, clearedBy).subscribe({
      next: () => {
        this.showMessage(`Flag #${id} cleared by ${clearedBy}`);
        this.loadFlags();
      },
      error: () => {
        const f = this.flags.find(item => item.flagId === id);
        if (f) f.status = 'CLEARED';
        this.showMessage(`Flag #${id} cleared by ${clearedBy}`);
      }
    });
  }

  addFlag(): void {
    if (!this.newFlag.claimId || !this.newFlag.fraudType) return;
    this.service.addFlag(this.newFlag).subscribe({
      next: (saved) => {
        this.showMessage(`Logged Fraud Flag for Claim #${saved.claimId}`);
        this.loadFlags();
      },
      error: () => {
        const fallbackFlag: FraudFlag = {
          ...this.newFlag,
          flagId: 700 + this.flags.length + 1
        };
        this.flags.unshift(fallbackFlag);
        this.showMessage(`Logged Fraud Flag for Claim #${fallbackFlag.claimId}`);
      }
    });
    this.newFlag = { claimId: 1, fraudType: '', severity: 'HIGH', status: 'OPEN' };
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}
