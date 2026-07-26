import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnderwritingService, UnderwritingApplication, RiskFactor } from '../../services/underwriting.service';
import { Policy } from '../../../policy/models/policy.model';
import { NotificationService } from '../../../notifications/services/notification.service';

@Component({
  selector: 'app-underwriting-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './underwriting-list.html',
  styleUrls: ['./underwriting-list.css']
})
export class UnderwritingListComponent implements OnInit {

  private service = inject(UnderwritingService);
  private notificationService = inject(NotificationService);

  applications: UnderwritingApplication[] = [];
  pendingPolicies: Policy[] = [];
  selectedApp: UnderwritingApplication | null = null;
  selectedPolicy: Policy | null = null;
  riskFactors: RiskFactor[] = [];
  showRiskModal = false;

  newApp: UnderwritingApplication = { policyId: 101, underwriterId: 1, decision: 'PENDING' };
  newFactor: RiskFactor = { applicationId: 0, factorType: '', factorValue: '', weight: 0.5 };
  message: string = '';

  private readonly POLICIES_KEY = 'claimedge_clean_policies_master_v12';

  ngOnInit(): void {
    this.loadApplications();
  }

  getMasterPolicies(): Policy[] {
    try {
      const stored = localStorage.getItem(this.POLICIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveMasterPolicies(list: Policy[]): void {
    localStorage.setItem(this.POLICIES_KEY, JSON.stringify(list));
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
    const allPolicies = this.getMasterPolicies();

    // 1. STRICT FILTER: Only policies subscribed by Policyholders with status "Pending Underwriting" or "Pending"
    this.pendingPolicies = allPolicies.filter(p => {
      const st = (p.status || '').toUpperCase();
      return st === 'PENDING UNDERWRITING' || st === 'PENDING';
    });

    this.service.getAllApplications().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.applications = this.deduplicateApplications(data);
        } else {
          this.initSampleApplications(allPolicies);
        }
      },
      error: () => {
        this.initSampleApplications(allPolicies);
      }
    });
  }

  initSampleApplications(allPolicies: Policy[]): void {
    // Only generate scorecards for subscribed policies (excluding Draft policies)
    const subscribed = allPolicies.filter(p => (p.status || '').toUpperCase() !== 'DRAFT');
    const samples: UnderwritingApplication[] = subscribed.map((p, idx) => ({
      applicationId: 201 + idx,
      policyId: p.policyId!,
      riskScore: (idx % 2 === 0) ? 65 : 82,
      premiumRecommended: p.premium,
      underwriterId: 102,
      decision: (p.status === 'Active' || p.status === 'Approved - Pending Payment') ? 'APPROVED' : 'PENDING',
      decisionDate: new Date().toISOString().split('T')[0]
    }));
    this.applications = this.deduplicateApplications(samples);
  }

  calculateRiskForPolicy(p: Policy): void {
    let app = this.applications.find(a => String(a.policyId) === String(p.policyId));
    if (!app) {
      app = {
        applicationId: Math.floor(1000 + Math.random() * 9000),
        policyId: p.policyId!,
        riskScore: Math.floor(Math.random() * 40) + 50,
        premiumRecommended: p.premium,
        underwriterId: 102,
        decision: 'PENDING',
        decisionDate: new Date().toISOString().split('T')[0]
      };
      this.applications.unshift(app);
      this.applications = this.deduplicateApplications(this.applications);
    }
    this.evaluateRisk(app);
  }

  viewRiskFactorsForPolicy(p: Policy): void {
    let app = this.applications.find(a => String(a.policyId) === String(p.policyId));
    if (!app) {
      app = {
        applicationId: Math.floor(1000 + Math.random() * 9000),
        policyId: p.policyId!,
        riskScore: 65,
        premiumRecommended: p.premium,
        underwriterId: 102,
        decision: 'PENDING',
        decisionDate: new Date().toISOString().split('T')[0]
      };
      this.applications.unshift(app);
      this.applications = this.deduplicateApplications(this.applications);
    }
    this.selectedPolicy = p;
    this.selectAppForFactors(app);
    this.showRiskModal = true;
  }

  approvePolicy(p: Policy): void {
    const master = this.getMasterPolicies();
    const updated = master.map(item => {
      if (String(item.policyId) === String(p.policyId)) {
        return { ...item, status: 'Approved - Pending Payment' };
      }
      return item;
    });

    this.saveMasterPolicies(updated);

    // Update existing scorecard entry without creating duplicates
    let app = this.applications.find(a => String(a.policyId) === String(p.policyId));
    if (app) {
      app.decision = 'APPROVED';
      app.decisionDate = new Date().toISOString().split('T')[0];
    } else {
      this.applications.unshift({
        applicationId: Math.floor(1000 + Math.random() * 9000),
        policyId: p.policyId!,
        riskScore: 65,
        premiumRecommended: p.premium,
        underwriterId: 102,
        decision: 'APPROVED',
        decisionDate: new Date().toISOString().split('T')[0]
      });
    }
    this.applications = this.deduplicateApplications(this.applications);

    // Notify Policyholder
    this.notificationService.createNotification(
      p.policyHolderId || 101,
      `Great news! Your Policy Application #${p.policyId} (${p.productType}) has been APPROVED by Underwriter! Please proceed to Payments to complete premium payment of ₹${p.premium}.`,
      'Policy'
    ).subscribe({ error: () => {} });

    this.showMessage(`✅ Policy #${p.policyId} Approved! Status updated to Approved - Pending Payment.`);
    this.loadApplications();
  }

  rejectPolicy(p: Policy): void {
    const master = this.getMasterPolicies();
    const updated = master.map(item => {
      if (String(item.policyId) === String(p.policyId)) {
        return { ...item, status: 'Rejected' };
      }
      return item;
    });

    this.saveMasterPolicies(updated);

    // Update existing scorecard entry without creating duplicates
    let app = this.applications.find(a => String(a.policyId) === String(p.policyId));
    if (app) {
      app.decision = 'DECLINED';
      app.decisionDate = new Date().toISOString().split('T')[0];
    } else {
      this.applications.unshift({
        applicationId: Math.floor(1000 + Math.random() * 9000),
        policyId: p.policyId!,
        riskScore: 85,
        premiumRecommended: p.premium,
        underwriterId: 102,
        decision: 'DECLINED',
        decisionDate: new Date().toISOString().split('T')[0]
      });
    }
    this.applications = this.deduplicateApplications(this.applications);

    // Notify Policyholder
    this.notificationService.createNotification(
      p.policyHolderId || 101,
      `Policy Application #${p.policyId} (${p.productType}) was REJECTED by Underwriting Risk Review.`,
      'Policy'
    ).subscribe({ error: () => {} });

    this.showMessage(`🚫 Policy #${p.policyId} Rejected by Underwriting.`);
    this.loadApplications();
  }

  evaluateRisk(app: UnderwritingApplication): void {
    const score = Math.floor(Math.random() * 40) + 55;
    app.riskScore = score;
    app.decisionDate = new Date().toISOString().split('T')[0];

    if (score < 70) {
      app.decision = 'APPROVED';
      app.premiumRecommended = (app.premiumRecommended || 15000);
      this.showMessage(`✅ Policy #${app.policyId} Evaluated: LOW RISK (Score: ${score}). Recommended Premium ₹${app.premiumRecommended}`);
    } else if (score < 85) {
      app.decision = 'REFERRED';
      app.premiumRecommended = Math.round((app.premiumRecommended || 15000) * 1.15);
      this.showMessage(`⚠️ Policy #${app.policyId} Evaluated: MEDIUM RISK (Score: ${score}). Referred with +15% Risk Premium Adjustment (₹${app.premiumRecommended})`);
    } else {
      app.decision = 'DECLINED';
      this.showMessage(`🚫 Policy #${app.policyId} Evaluated: HIGH RISK (Score: ${score}). Declined due to excessive risk factors.`);
    }

    if (app.applicationId) {
      this.service.evaluateRisk(app.applicationId).subscribe({ error: () => {} });
    }
  }

  selectAppForFactors(app: UnderwritingApplication): void {
    this.selectedApp = app;
    this.riskFactors = [
      { factorId: 1, applicationId: app.applicationId || 201, factorType: 'Claims History', factorValue: 'No Prior Claims (Clean Record)', weight: 0.2 },
      { factorId: 2, applicationId: app.applicationId || 201, factorType: 'Applicant Age / Demographics', factorValue: 'Standard Age Category (32 Yrs)', weight: 0.3 },
      { factorId: 3, applicationId: app.applicationId || 201, factorType: 'Asset / Vehicle Condition', factorValue: 'Inspected - Good Condition', weight: 0.5 }
    ];
  }

  addRiskFactor(): void {
    if (!this.newFactor.factorType || !this.newFactor.factorValue) return;
    const newId = this.riskFactors.length + 1;
    this.riskFactors.push({ ...this.newFactor, factorId: newId });
    this.showMessage(`Added Risk Factor #${newId}: ${this.newFactor.factorType}`);
    this.newFactor = { applicationId: this.selectedApp?.applicationId || 0, factorType: '', factorValue: '', weight: 0.5 };
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}
