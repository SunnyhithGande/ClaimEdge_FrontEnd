import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface AuditLog {
  auditId: number;
  userId: number;
  claimId: number;
  action: string;
  module: string;
  timestamp: string;
}

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.css'
})
export class AuditLogsComponent implements OnInit {
  private http = inject(HttpClient);
  
  logs: AuditLog[] = [];
  filteredLogs: AuditLog[] = [];
  loading = true;
  error = '';
  
  // Filters
  filterClaimId: string = '';
  filterModule: string = '';
  filterUser: string = '';
  filterDate: string = '';

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.http.get<AuditLog[]>('http://localhost:8010/api/audit-logs').subscribe({
      next: (data) => {
        this.logs = data;
        this.filteredLogs = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load audit logs', err);
        this.error = 'Failed to load audit logs.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredLogs = this.logs.filter(log => {
      const matchClaim = this.filterClaimId ? log.claimId?.toString().includes(this.filterClaimId) || log.action?.includes(this.filterClaimId) : true;
      const matchModule = this.filterModule ? log.module?.toLowerCase().includes(this.filterModule.toLowerCase()) : true;
      const matchUser = this.filterUser ? log.userId?.toString().includes(this.filterUser) : true;
      const matchDate = this.filterDate ? log.timestamp?.includes(this.filterDate) : true;
      return matchClaim && matchModule && matchUser && matchDate;
    });
  }

  clearFilters(): void {
    this.filterClaimId = '';
    this.filterModule = '';
    this.filterUser = '';
    this.filterDate = '';
    this.applyFilters();
  }

  generateReport(): void {
    window.print();
  }

  getIconForAction(action: string): string {
    action = action.toLowerCase();
    if (action.includes('submit')) return 'bi-file-earmark-plus';
    if (action.includes('fraud')) return 'bi-shield-exclamation';
    if (action.includes('investigat')) return 'bi-search';
    if (action.includes('clear')) return 'bi-check-circle';
    if (action.includes('assign')) return 'bi-person-plus';
    if (action.includes('approve')) return 'bi-check2-all';
    if (action.includes('settle')) return 'bi-cash-stack';
    if (action.includes('reject')) return 'bi-x-circle';
    return 'bi-activity';
  }

  getColorForAction(action: string): string {
    action = action.toLowerCase();
    if (action.includes('fraud') || action.includes('reject')) return 'text-danger';
    if (action.includes('approve') || action.includes('clear') || action.includes('settle')) return 'text-success';
    if (action.includes('assign') || action.includes('investigat')) return 'text-warning';
    return 'text-primary';
  }
}
