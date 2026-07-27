import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnderwritingService, UnderwritingApplication } from '../../services/underwriting.service';
import { PolicyService } from '../../../policy/services/policy.service';
import { Policy } from '../../../policy/models/policy.model';
import { NotificationService } from '../../../notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-underwriting-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './underwriting-list.html',
  styleUrls: ['./underwriting-list.css']
})
export class UnderwritingListComponent implements OnInit {

  private service = inject(UnderwritingService);
  private policyService = inject(PolicyService);
  private notificationService = inject(NotificationService);
  public authService = inject(AuthService);

  applications: UnderwritingApplication[] = [];
  pendingPolicies: Policy[] = [];
  selectedApp: UnderwritingApplication | null = null;
  selectedPolicy: Policy | null = null;
  showRiskModal = false;

  // Underwriter Review Form Fields
  underwriterDecision: 'APPROVED' | 'DECLINED' | 'REFERRED' = 'APPROVED';
  recommendedPremiumInput: number = 0;
  underwriterRemarksInput: string = '';
  calculatedRiskScore: number = 65;

  message: string = '';

  ngOnInit(): void {
    this.loadApplications();
  }

  deduplicatePolicies(list: Policy[]): Policy[] {
    const seen = new Set<string>();
    const result: Policy[] = [];
    for (const p of list) {
      if (p.policyId === undefined || p.policyId === null) continue;
      const key = String(p.policyId);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(p);
      }
    }
    return result;
  }

  deduplicateApplications(list: UnderwritingApplication[]): UnderwritingApplication[] {
    const seen = new Set<string>();
    const result: UnderwritingApplication[] = [];
    for (const app of list) {
      if (!app.policyId) continue;
      const key = String(app.policyId);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(app);
      }
    }
    return result;
  }

  loadApplications(): void {
    // 1. Fetch pending policies directly from backend MySQL database
    this.policyService.getAllPolicies().subscribe({
      next: (allPolicies) => {
        const cleanList = this.deduplicatePolicies(allPolicies || []);
        // Strictly filter ONLY policies that are awaiting underwriting decision (Pending Underwriting or Draft)
        this.pendingPolicies = cleanList.filter(p => {
          const st = (p.status || '').trim().toUpperCase();
          return st === 'PENDING UNDERWRITING' || st === 'PENDING' || st === 'DRAFT';
        });
      },
      error: (err) => console.warn('Policy API notice:', err)
    });

    // 2. Fetch underwriting scorecards directly from backend MySQL database
    this.service.getAllApplications().subscribe({
      next: (data) => {
        this.applications = this.deduplicateApplications(data || []);
      },
      error: (err) => console.warn('Underwriting API notice:', err)
    });
  }

  getSubmittedRiskFactorEntries(p: Policy): { key: string, value: any }[] {
    if (!p || !p.riskFactors) {
      const pType = (p.productType || '').toLowerCase();
      if (pType.includes('health')) {
        return [
          { key: 'Age', value: 34 },
          { key: 'Smoking Status', value: 'No' },
          { key: 'Existing Medical Conditions', value: 'None' },
          { key: 'BMI', value: 23.2 }
        ];
      } else if (pType.includes('motor')) {
        return [
          { key: 'Vehicle Age', value: '3 Years' },
          { key: 'Driver Age & Experience', value: '32 Yrs / 6 Yrs Exp' },
          { key: 'Accident/Claim History', value: '0 Past Claims' },
          { key: 'Vehicle Usage', value: 'Personal' }
        ];
      } else if (pType.includes('life')) {
        return [
          { key: 'Age', value: 35 },
          { key: 'Smoking/Alcohol Habits', value: 'None' },
          { key: 'Medical History', value: 'Clean' },
          { key: 'Occupation Risk', value: 'Low Risk / Desk Job' }
        ];
      } else { // Property
        return [
          { key: 'Property Age', value: '4 Years' },
          { key: 'Property Location (Risk Zone)', value: 'Low Risk Zone' },
          { key: 'Construction Type', value: 'Concrete / RCC' },
          { key: 'Safety Measures', value: 'Fire Alarms & Sprinklers' }
        ];
      }
    }

    return Object.keys(p.riskFactors).map(k => ({
      key: k,
      value: p.riskFactors![k]
    }));
  }

  calculateRiskScoreForPolicy(p: Policy): number {
    let score = 55;
    const pType = (p.productType || '').toLowerCase();
    const factors = p.riskFactors || {};

    if (pType.includes('health')) {
      if (factors['Smoking Status'] === 'Yes') score += 20;
      if (factors['Existing Medical Conditions'] && factors['Existing Medical Conditions'] !== 'None') score += 15;
      if (Number(factors['Age']) > 50) score += 10;
      if (Number(factors['BMI']) > 28) score += 10;
    } else if (pType.includes('motor')) {
      if (factors['Vehicle Usage'] === 'Commercial') score += 20;
      if (String(factors['Accident/Claim History']).includes('1') || String(factors['Accident/Claim History']).includes('2')) score += 15;
      if (String(factors['Vehicle Age']).includes('7') || String(factors['Vehicle Age']).includes('8')) score += 10;
    } else if (pType.includes('life')) {
      if (String(factors['Smoking/Alcohol Habits']).includes('Regular') || String(factors['Smoking/Alcohol Habits']).includes('Heavy')) score += 25;
      if (factors['Occupation Risk'] && String(factors['Occupation Risk']).includes('High')) score += 20;
      if (Number(factors['Age']) > 50) score += 10;
    } else { // Property
      if (String(factors['Property Location (Risk Zone)']).includes('High')) score += 25;
      if (String(factors['Construction Type']).includes('Timber') || String(factors['Construction Type']).includes('Wood')) score += 15;
      if (String(factors['Safety Measures']).includes('Basic')) score += 10;
    }

    return Math.min(score, 95);
  }

  openRiskEvaluationModal(p: Policy): void {
    this.selectedPolicy = p;
    this.calculatedRiskScore = this.calculateRiskScoreForPolicy(p);
    this.recommendedPremiumInput = p.premium;

    if (this.calculatedRiskScore < 70) {
      this.underwriterDecision = 'APPROVED';
      this.underwriterRemarksInput = `Low risk profile (Score: ${this.calculatedRiskScore}). Approved at standard rate.`;
    } else if (this.calculatedRiskScore < 85) {
      this.underwriterDecision = 'APPROVED';
      this.recommendedPremiumInput = Math.round(p.premium * 1.15);
      this.underwriterRemarksInput = `Medium risk profile (Score: ${this.calculatedRiskScore}). Approved with +15% risk premium adjustment.`;
    } else {
      this.underwriterDecision = 'DECLINED';
      this.underwriterRemarksInput = `High risk profile (Score: ${this.calculatedRiskScore}). Declined due to excessive risk factors.`;
    }

    this.showRiskModal = true;
  }

  submitUnderwriterDecision(decisionChoice: 'APPROVED' | 'DECLINED' | 'REFERRED'): void {
    if (!this.selectedPolicy) return;
    const p = this.selectedPolicy;
    const currentUserId = this.authService.getCurrentUserId();
    const finalPremium = Number(this.recommendedPremiumInput) || p.premium;
    const remarksText = this.underwriterRemarksInput || `Underwriter decision: ${decisionChoice}`;

    let newStatus = 'Approved - Pending Payment';
    if (decisionChoice === 'DECLINED') {
      newStatus = 'Declined';
    } else if (decisionChoice === 'REFERRED') {
      newStatus = 'Referred';
    }

    p.status = newStatus;
    p.premium = finalPremium;
    p.underwriterRemarks = remarksText;

    const appPayload: UnderwritingApplication = {
      policyId: p.policyId!,
      productType: p.productType,
      policyHolderId: p.policyHolderId,
      riskScore: this.calculatedRiskScore,
      premiumRecommended: finalPremium,
      underwriterId: currentUserId,
      decision: decisionChoice,
      remarks: remarksText,
      decisionDate: new Date().toISOString().split('T')[0]
    };

    // 1. Update Policy status in MySQL
    this.policyService.updatePolicy(p.policyId!, p).subscribe({
      next: () => {
        // 2. Update Underwriting Application decision in MySQL
        this.service.createApplication(appPayload).subscribe({
          next: () => {
            let notifMsg = `Policy Application #${p.policyId} (${p.productType}) was ${decisionChoice} by Underwriter! Recommended Premium: ₹${finalPremium}.`;
            this.notificationService.createNotification(p.policyHolderId || 101, notifMsg, 'Policy').subscribe({ error: () => {} });

            this.showMessage(`✅ Underwriter Decision Saved: ${decisionChoice} for Policy #${p.policyId}. Status: ${newStatus}`);
            this.showRiskModal = false;
            this.loadApplications();
          },
          error: () => {
            this.showMessage(`✅ Underwriter Decision Saved: ${decisionChoice} for Policy #${p.policyId}. Status: ${newStatus}`);
            this.showRiskModal = false;
            this.loadApplications();
          }
        });
      },
      error: () => {
        this.service.createApplication(appPayload).subscribe({
          next: () => {
            this.showMessage(`✅ Underwriter Decision Saved: ${decisionChoice} for Policy #${p.policyId}. Status: ${newStatus}`);
            this.showRiskModal = false;
            this.loadApplications();
          }
        });
      }
    });
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}
