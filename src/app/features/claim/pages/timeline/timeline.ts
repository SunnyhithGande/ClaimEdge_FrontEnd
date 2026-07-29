import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClaimsService } from '../../services/claim.service';
import { AuthService } from '../../../../core/services/auth.service';

export interface FlowchartStep {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  icon: string;
  statusText: string;
  dateStr: string;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timeline.html',
  styleUrls: ['./timeline.css']
})
export class TimelineComponent implements OnInit {

  private claimsService = inject(ClaimsService);
  private authService = inject(AuthService);

  claimId: string = '';
  claimDetails: any = null;
  timeline: string[] = [];
  errorMessage: string = '';
  loading = false;

  flowchartSteps: FlowchartStep[] = [];

  ngOnInit(): void {
    this.loadTimeline();
  }

  loadTimeline(): void {
    this.errorMessage = '';
    if (!this.claimId) {
      this.errorMessage = 'Please enter a Claim ID to track.';
      this.claimDetails = null;
      this.flowchartSteps = [];
      this.timeline = [];
      return;
    }

    const id = Number(this.claimId);
    if (isNaN(id)) {
      this.errorMessage = 'Invalid Claim ID format.';
      this.claimDetails = null;
      this.flowchartSteps = [];
      this.timeline = [];
      return;
    }

    this.loading = true;

    const isPolicyHolder = this.authService.hasRole('POLICYHOLDER');

    if (isPolicyHolder) {
      this.claimsService.getClaimsByUserId(this.authService.getCurrentUserId()).subscribe({
        next: (claims: any[]) => {
          const c = (claims || []).find(claim => claim.claimId === id);
          if (c) {
            this.processClaimSuccess(c, id);
          } else {
            this.processClaimError(id);
          }
        },
        error: () => this.processClaimError(id)
      });
    } else {
      this.claimsService.getClaimById(id).subscribe({
        next: (c: any) => this.processClaimSuccess(c, id),
        error: () => this.processClaimError(id)
      });
    }
  }

  processClaimSuccess(c: any, id: number): void {
    this.loading = false;
    const activeStatus = c?.status || 'SUBMITTED';

    this.claimDetails = {
      ...c,
      status: activeStatus
    };
    this.buildFlowchart(activeStatus);
    this.timeline = this.buildTimelineList(id, activeStatus);
  }

  processClaimError(id: number): void {
    this.loading = false;
    this.claimDetails = null;
    this.flowchartSteps = [];
    this.timeline = [];
    this.errorMessage = `❌ Claim #${id} does not exist in your account. Please enter a valid Claim ID.`;
  }

  buildFlowchart(currentStatus: string): void {
    const st = (currentStatus || '').toUpperCase();
    const date = this.claimDetails?.incidentDate || '2026-07-25';

    this.flowchartSteps = [
      {
        id: 'SUBMITTED',
        stepNumber: 1,
        title: 'Claim Submission',
        subtitle: 'Customer Filed Claim',
        icon: 'bi-file-earmark-arrow-up',
        statusText: 'SUBMITTED',
        dateStr: date
      },
      {
        id: 'UNDER_REVIEW',
        stepNumber: 2,
        title: 'Technical Review',
        subtitle: 'Adjuster Inspection',
        icon: 'bi-person-badge',
        statusText: 'UNDER REVIEW',
        dateStr: date
      },
      {
        id: 'APPROVED',
        stepNumber: 3,
        title: st === 'REJECTED' ? 'Claim Rejection' : 'Payout Decision',
        subtitle: st === 'REJECTED' ? 'Inspection Rejected' : 'Approved for Payout',
        icon: st === 'REJECTED' ? 'bi-x-circle' : 'bi-shield-check',
        statusText: st === 'REJECTED' ? 'REJECTED' : 'APPROVED',
        dateStr: date
      },
      {
        id: 'SETTLED',
        stepNumber: 4,
        title: 'Disbursement',
        subtitle: 'Payment Settled',
        icon: 'bi-cash-stack',
        statusText: 'SETTLED',
        dateStr: date
      }
    ];
  }

  isStageCompleted(stepId: string): boolean {
    const st = (this.claimDetails?.status || '').toUpperCase();

    if (stepId === 'SUBMITTED') return true;

    if (stepId === 'UNDER_REVIEW') {
      return st === 'UNDER_REVIEW' || st === 'APPROVED' || st === 'REJECTED' || st === 'SETTLED';
    }

    if (stepId === 'APPROVED') {
      return st === 'APPROVED' || st === 'REJECTED' || st === 'SETTLED';
    }

    if (stepId === 'SETTLED') {
      return st === 'SETTLED';
    }

    return false;
  }

  isStageActive(stepId: string): boolean {
    const st = (this.claimDetails?.status || '').toUpperCase();
    if (stepId === 'APPROVED' && (st === 'APPROVED' || st === 'REJECTED')) return true;
    return st === stepId;
  }

  buildTimelineList(id: number, status: string): string[] {
    const list = [
      `Submitted on: ${this.claimDetails?.incidentDate || '2026-07-25'} (Status: SUBMITTED)`
    ];

    if (status === 'UNDER_REVIEW' || status === 'APPROVED' || status === 'REJECTED' || status === 'SETTLED') {
      list.push(`Under Review: Assigned to Adjuster for technical inspection`);
    }

    if (status === 'APPROVED' || status === 'SETTLED') {
      list.push(`APPROVED: Claim inspected and approved by Claims Adjuster. Payout recommended.`);
    } else if (status === 'REJECTED') {
      list.push(`REJECTED: Claim inspected and rejected by Claims Adjuster.`);
    }

    if (status === 'SETTLED') {
      list.push(`SETTLED: Payout disbursement processed and payment settled.`);
    }

    return list;
  }
}