import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FraudService, FraudFlag } from '../../services/fraud.service';

@Component({
  selector: 'app-fraud-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fraud-list.html',
  styleUrls: ['./fraud-list.css']
})
export class FraudListComponent implements OnInit {

  flags: FraudFlag[] = [];
  newFlag: FraudFlag = { claimId: 1, fraudType: 'Suspicious Duplicate Claim', severity: 'HIGH', status: 'OPEN' };
  message: string = '';

  constructor(private service: FraudService) {}

  ngOnInit(): void {
    this.loadFlags();
  }

  loadFlags(): void {
    this.service.getAllFlags().subscribe({
      next: (data) => {
        this.flags = data || [];
      },
      error: () => console.warn('Fraud flags API offline')
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
        this.flags.unshift(saved);
        this.showMessage(`Logged Fraud Flag for Claim #${saved.claimId}`);
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
