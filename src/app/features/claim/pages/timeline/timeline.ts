import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClaimsService } from '../../services/claim.service';

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

  claimId: string = '3';
  claimDetails: any = null;
  timeline: string[] = [];
  errorMessage: string = '';
  loading = false;

  private readonly OVERRIDES_KEY = 'claim_status_overrides';
  private readonly CLAIMS_MASTER_KEY = 'claimedge_clean_claims_master_v12';

  flowchartSteps: FlowchartStep[] = [];

  ngOnInit(): void {
    this.loadTimeline();
  }

  getStatusOverrides(): { [key: number]: { status: string, adjusterId?: number } } {
    try {
      const stored = localStorage.getItem(this.OVERRIDES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  getMasterClaims(): any[] {
    try {
      const stored = localStorage.getItem(this.CLAIMS_MASTER_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}

    return [
      { claimId: 1, policyId: 2, claimType: 'Vehicle Accident', incidentDate: '2026-07-20', claimAmount: 45000, assignedAdjusterId: 1, status: 'APPROVED' },
      { claimId: 2, policyId: 1, claimType: 'Property Damage', incidentDate: '2026-07-25', claimAmount: 23444, assignedAdjusterId: null, status: 'SETTLED' },
      { claimId: 3, policyId: 1, claimType: 'Vehicle Damage', incidentDate: '2026-07-25', claimAmount: 10000, assignedAdjusterId: null, status: 'SETTLED' },
      { claimId: 4, policyId: 47, claimType: 'Life Benefit', incidentDate: '2026-07-25', claimAmount: 40000, assignedAdjusterId: null, status: 'SETTLED' },
      { claimId: 5, policyId: 47, claimType: 'Medical Hospitalization', incidentDate: '2026-07-25', claimAmount: 6969, assignedAdjusterId: 69, status: 'SETTLED' }
    ];
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
    const overrides = this.getStatusOverrides();
    const masterList = this.getMasterClaims();

    // Check if claim exists in local master list
    const foundMaster = masterList.find((c: any) => Number(c.claimId) === id);

    this.claimsService.getClaimById(id).subscribe({
      next: (c: any) => {
        this.loading = false;
        let activeStatus = c?.status || 'SUBMITTED';
        if (overrides[id] && overrides[id].status) {
          activeStatus = overrides[id].status;
        }

        this.claimDetails = {
          ...c,
          status: activeStatus
        };
        this.buildFlowchart(activeStatus);
        this.timeline = this.buildTimelineList(id, activeStatus);
      },
      error: () => {
        this.loading = false;
        if (foundMaster) {
          let activeStatus = foundMaster.status || 'SUBMITTED';
          if (overrides[id] && overrides[id].status) {
            activeStatus = overrides[id].status;
          }

          this.claimDetails = {
            ...foundMaster,
            status: activeStatus
          };
          this.buildFlowchart(activeStatus);
          this.timeline = this.buildTimelineList(id, activeStatus);
        } else {
          // CLAIM DOES NOT EXIST IN SYSTEM
          this.claimDetails = null;
          this.flowchartSteps = [];
          this.timeline = [];
          this.errorMessage = `❌ Claim #${id} does not exist in the system. Please enter a valid Claim ID (e.g. 1, 2, 3, 4, 5).`;
        }
      }
    });
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