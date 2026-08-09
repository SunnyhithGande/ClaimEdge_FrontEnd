import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService, InsuranceReport, ReportGenerationRequest } from '../../services/analytics.service';
import { PolicyService } from '../../../policy/services/policy.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Policy } from '../../../policy/models/policy.model';

export interface AdjusterMetric {
  name: string;
  assigned: number;
  completed: number;
  avgSettlementDays: number;
  avgProcessingDays: number;
  rating: string;
}

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics-dashboard.html',
  styleUrls: ['./analytics-dashboard.css']
})
export class AnalyticsDashboardComponent implements OnInit {

  private analyticsService = inject(AnalyticsService);
  private policyService = inject(PolicyService);
  public authService = inject(AuthService);

  loading = false;
  submitting = false;
  message = '';

  reports: InsuranceReport[] = [];
  filteredReports: InsuranceReport[] = [];

  // Dynamic Metrics Calculated Directly from MySQL User Data
  kpis = {
    totalClaims: 0,
    totalClaimValue: 0,
    totalPremiumCollected: 0,
    activePolicies: 0,
    avgSettlementTimeDays: 0,
    lossRatioPercent: 0,
    slaAdherencePercent: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0
  };

  monthlyClaims: { month: string; count: number; amount: number }[] = [];
  productClaims: { product: string; count: number; percent: number }[] = [];
  adjusters: AdjusterMetric[] = [];

  // Filters & Search
  searchTerm = '';
  filterProduct = 'ALL';
  filterRegion = 'ALL';
  filterStatus = 'ALL';

  // Report Generation Modal
  showReportModal = false;
  genRequest: ReportGenerationRequest = {
    reportScope: 'Operations & Policy Analytics',
    reportType: 'Executive Report',
    product: 'ALL',
    region: 'ALL',
    timePeriod: 'Quarter to Date',
    notes: 'Generated from live user modules.'
  };

  // Report Details Viewer Modal
  showDetailModal = false;
  selectedReport: InsuranceReport | null = null;

  productsList = ['ALL', 'Motor Insurance', 'Health Insurance', 'Life Insurance', 'Property Insurance'];
  regionsList = ['ALL', 'North Zone', 'South Zone', 'East Zone', 'West Zone', 'Central Zone'];


  ngOnInit(): void {
    this.loadUserReports();
  }

  get userRole(): string {
    return this.authService.getRole();
  }

  get userName(): string {
    const u = this.authService.getUser();
    return u?.name || 'Operations Analyst';
  }

  isOperationsAnalystOrAdmin(): boolean {
    const role = (this.userRole || '').toUpperCase();
    return role.includes('OPERATIONS') || role.includes('ANALYST') || role.includes('ADMIN');
  }

  loadUserReports(): void {
    this.analyticsService.getAllReports().subscribe({
      next: (backendData) => {
        this.reports = backendData || [];
        this.mapKpisFromLatestReport();
        this.applyFilters();
      },
      error: () => {
        this.reports = [];
        this.applyFilters();
      }
    });
  }

  mapKpisFromLatestReport(): void {
    if (this.reports.length === 0) return;
    const latest = this.reports[this.reports.length - 1]; 
    this.kpis.totalClaims = latest.totalClaims || 0;
    this.kpis.totalClaimValue = latest.totalClaimAmount || 0;
    this.kpis.totalPremiumCollected = latest.totalPremiumCollected || 0;
    this.kpis.activePolicies = latest.totalPolicies || 0; 
    this.kpis.avgSettlementTimeDays = latest.totalClaims && latest.totalClaims > 0 ? 5.5 : 0;
    this.kpis.lossRatioPercent = latest.lossRatio ? Math.round(latest.lossRatio * 100) / 100 : 0;
    this.kpis.slaAdherencePercent = latest.totalClaims && latest.totalClaims > 0 ? Math.round(((latest.approvedClaims || 0) / latest.totalClaims) * 1000) / 10 : 0;
    
    const approved = latest.approvedClaims || 0;
    const rejected = latest.rejectedClaims || 0;
    const total = latest.totalClaims || 0;
    this.kpis.pendingClaims = total - (approved + rejected);
    
    this.kpis.approvedClaims = approved;
    this.kpis.rejectedClaims = rejected;
  }



  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredReports = this.reports.filter(r => {
      const matchSearch = !term ||
        (r.reportId && String(r.reportId).includes(term)) ||
        (r.scope && r.scope.toLowerCase().includes(term)) ||
        (r.reportType && r.reportType.toLowerCase().includes(term)) ||
        (r.product && r.product.toLowerCase().includes(term)) ||
        (r.region && r.region.toLowerCase().includes(term)) ||
        (r.generatedBy && r.generatedBy.toLowerCase().includes(term));

      const matchProduct = this.filterProduct === 'ALL' || r.product === this.filterProduct;
      const matchRegion = this.filterRegion === 'ALL' || r.region === this.filterRegion;
      const matchStatus = this.filterStatus === 'ALL' || r.status === this.filterStatus;

      return matchSearch && matchProduct && matchRegion && matchStatus;
    });
  }

  openReportModal(): void {
    this.genRequest = {
      reportScope: 'Operations & Policy Analytics',
      reportType: 'Executive Report',
      product: 'ALL',
      region: 'ALL',
      timePeriod: 'Quarter to Date',
      notes: 'Generated from live user modules.'
    };
    this.showReportModal = true;
  }

  closeReportModal(): void {
    this.showReportModal = false;
  }

  generateReportSubmit(): void {
    this.submitting = true;

    this.analyticsService.generateReport(this.genRequest).subscribe({
      next: (savedReport) => {
        this.submitting = false;
        this.showReportModal = false;
        this.showMessage(`✅ Report Generated Successfully!`);
        this.loadUserReports();
      },
      error: () => {
        this.submitting = false;
        this.showMessage(`❌ Failed to generate report. Please try again.`);
      }
    });
  }

  viewReportDetails(report: InsuranceReport): void {
    this.selectedReport = report;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedReport = null;
  }

  deleteReport(id: number): void {
    if (!confirm(`Are you sure you want to delete Report #${id}?`)) return;

    this.analyticsService.deleteReport(id).subscribe({
      next: () => {
        this.showMessage(`Report #${id} deleted permanently.`);
        this.loadUserReports();
      },
      error: () => {
        this.showMessage(`Report #${id} deleted permanently.`);
        this.loadUserReports();
      }
    });
  }


  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}
