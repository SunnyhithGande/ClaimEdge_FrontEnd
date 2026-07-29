import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
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

@Component({
  selector: 'app-compliance-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './compliance-dashboard.html',
  styleUrl: './compliance-dashboard.css'
})
export class ComplianceDashboardComponent implements OnInit {

  private http = inject(HttpClient);
  private claimsService = inject(ClaimsService);
  
  displayedClaims: any[] = [];
  selectedCategoryTitle = 'All Claims';

  flags: FraudFlag[] = [];
  recentFlags: FraudFlag[] = [];
  
  // Stats
  totalFlags = 0;
  openCount = 0;
  clearedCount = 0;
  investigatedCount = 0;
  confirmedCount = 0;
  
  highSeverityCount = 0;
  mediumSeverityCount = 0;
  lowSeverityCount = 0;

  // Compliance Summary Stats
  totalClaims = 0;
  approvedClaims = 0;
  rejectedClaims = 0;
  settledClaims = 0;
  openAudits = 0;

  loading = true;
  error = '';

  ngOnInit(): void {
    this.loadData();
    this.selectCategory('TOTAL', 'All Claims');
  }

  loadData(): void {
    this.loading = true;
    
    // Fetch fraud flags
    this.http.get<FraudFlag[]>('http://localhost:8010/api/fraud').subscribe({
      next: (data) => {
        this.flags = data;
        this.calculateStats();
        
        // Fetch compliance summary stats
        this.http.get<any>('http://localhost:8010/api/compliance/dashboard/summary').subscribe({
            next: (summary) => {
                this.totalClaims = summary.totalClaims || 0;
                this.approvedClaims = summary.approvedClaims || 0;
                this.rejectedClaims = summary.rejectedClaims || 0;
                this.settledClaims = summary.settledClaims || 0;
                this.openAudits = summary.openAudits || 0;
                
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load compliance summary', err);
                this.loading = false;
            }
        });
      },
      error: (err) => {
        console.error('Failed to load fraud flags', err);
        this.error = 'Failed to load data.';
        this.loading = false;
      }
    });
  }

  private calculateStats(): void {
    this.totalFlags = this.flags.length;
    this.highSeverityCount = 0;
    this.mediumSeverityCount = 0;
    this.lowSeverityCount = 0;
    this.openCount = 0;
    this.clearedCount = 0;
    this.investigatedCount = 0;
    this.confirmedCount = 0;

    this.flags.forEach(f => {
      if (f.severity === 'HIGH' || f.severity === 'High') this.highSeverityCount++;
      else if (f.severity === 'MEDIUM' || f.severity === 'Medium') this.mediumSeverityCount++;
      else this.lowSeverityCount++;

      if (f.status === 'OPEN') this.openCount++;
      else if (f.status === 'CLEARED') this.clearedCount++;
      else if (f.status === 'INVESTIGATED') this.investigatedCount++;
      else if (f.status === 'CONFIRMED_FRAUD' || f.status === 'CONFIRMED') this.confirmedCount++;
    });

    this.recentFlags = [...this.flags].sort((a, b) => {
      return (b.flagId || 0) - (a.flagId || 0);
    }).slice(0, 5); // Show latest 5
  }

  selectCategory(category: string, title: string): void {
    this.selectedCategoryTitle = title;
    switch (category) {
      case 'TOTAL':
        this.claimsService.getAllClaims().subscribe(res => this.displayedClaims = res);
        break;
      case 'APPROVED':
        this.claimsService.getApprovedClaims().subscribe(res => this.displayedClaims = res);
        break;
      case 'REJECTED':
        this.claimsService.getRejectedClaims().subscribe(res => this.displayedClaims = res);
        break;
      case 'SETTLED':
        this.claimsService.getSettledClaims().subscribe(res => this.displayedClaims = res);
        break;
      case 'UNDER_REVIEW':
        this.claimsService.getUnderReviewClaims().subscribe(res => this.displayedClaims = res);
        break;
    }
  }

  generateComplianceReport(): void {
    window.print();
  }
}
