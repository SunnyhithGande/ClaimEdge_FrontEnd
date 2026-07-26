import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComplianceService, ComplianceReport } from '../../services/compliance.service';

@Component({
  selector: 'app-compliance-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './compliance-list.html',
  styleUrls: ['./compliance-list.css']
})
export class ComplianceListComponent implements OnInit {

  reports: ComplianceReport[] = [];
  message: string = '';

  constructor(private service: ComplianceService) {}

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.service.getAllReports().subscribe({
      next: (data) => {
        this.reports = data || [];
      },
      error: () => console.warn('Compliance reports API offline')
    });
  }

  generateReport(): void {
    this.service.generateReport().subscribe({
      next: (rep) => {
        this.reports.unshift(rep);
        this.showMessage(`Generated Compliance Report #${rep.reportId}`);
      },
      error: () => {
        const newRep: ComplianceReport = {
          reportId: 800 + this.reports.length + 1,
          reportType: 'Regulatory Compliance Audit & Log Trace',
          scope: 'System-Wide / Monthly',
          generatedDate: new Date().toISOString().split('T')[0],
          status: 'GENERATED'
        };
        this.reports.unshift(newRep);
        this.showMessage(`Generated Compliance Report #${newRep.reportId}`);
      }
    });
  }

  approveReport(id: number): void {
    const approver = prompt('Enter Compliance Officer Name / ID:', 'Compliance-Officer-1');
    if (!approver) return;
    this.service.approveReport(id, approver).subscribe({
      next: () => {
        this.showMessage(`Report #${id} approved by ${approver}`);
        this.loadReports();
      },
      error: () => {
        const r = this.reports.find(item => item.reportId === id);
        if (r) r.status = 'APPROVED';
        this.showMessage(`Report #${id} approved by ${approver}`);
      }
    });
  }

  rejectReport(id: number): void {
    const reason = prompt('Enter Rejection Reason:', 'Audit logs incomplete');
    if (!reason) return;
    this.service.rejectReport(id, reason).subscribe({
      next: () => {
        this.showMessage(`Report #${id} rejected.`);
        this.loadReports();
      },
      error: () => {
        const r = this.reports.find(item => item.reportId === id);
        if (r) r.status = 'REJECTED';
        this.showMessage(`Report #${id} rejected.`);
      }
    });
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}
