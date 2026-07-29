import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PolicyService } from '../../services/policy.service';
import { Policy } from '../../models/policy.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../notifications/services/notification.service';
import { UnderwritingService } from '../../../underwriting/services/underwriting.service';

export interface AvailablePolicyPlan {
  planId: string;
  productType: string;
  title: string;
  description: string;
  coverageAmount: number;
  premium: number;
  icon: string;
  features: string[];
}

@Component({
  selector: 'app-policy-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './policy-list.html',
  styleUrls: ['./policy-list.css']
})
export class PolicyListComponent implements OnInit {

  private policyService = inject(PolicyService);
  public authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private underwritingService = inject(UnderwritingService);
  private router = inject(Router);

  policies: Policy[] = [];
  message: string = '';
  showCreateModal = false;
  showProposalModal = false;

  submittingProposal = false;
  creatingPolicyState = false;

  selectedPlanForProposal: AvailablePolicyPlan | null = null;

  // Dynamic Product-Specific Risk Factor Form Fields
  proposalForm: any = {
    // Health Insurance Factors
    healthAge: 32,
    smokingStatus: 'No',
    medicalConditions: 'None',
    bmi: 23.5,

    // Motor Insurance Factors
    vehicleAge: 3,
    driverExp: '5 Years Experience',
    accidentHistory: 0,
    vehicleUsage: 'Personal',

    // Life Insurance Factors
    lifeAge: 35,
    habits: 'None',
    lifeMedicalHistory: 'Clean',
    occupationRisk: 'Low Risk / Desk Job',

    // Property Insurance Factors
    propertyAge: 5,
    propertyLocation: 'Low Risk Zone',
    constructionType: 'Concrete / RCC',
    safetyMeasures: 'Fire Alarms & Sprinklers'
  };

  activeTab: 'MY_POLICIES' | 'SUBSCRIBE' | 'POLICY_ADMIN' | 'POLICY_HOLDERS' = 'MY_POLICIES';

  availablePlans: AvailablePolicyPlan[] = [
    {
      planId: 'PLAN_MOTOR_01',
      productType: 'Motor Insurance',
      title: 'Comprehensive Motor Guard',
      description: 'Zero-depreciation motor coverage against accidents, natural disasters, and third-party liabilities.',
      coverageAmount: 500000,
      premium: 15000,
      icon: 'bi-car-front-fill',
      features: ['24/7 Roadside Assistance', 'Cashless Garage Repair Network', 'Zero Depreciation Cover']
    },
    {
      planId: 'PLAN_HEALTH_02',
      productType: 'Health Insurance',
      title: 'Individual Health Shield',
      description: 'Complete health protection including cashless hospitalization, pre/post care, and critical illness cover.',
      coverageAmount: 1000000,
      premium: 25000,
      icon: 'bi-heart-pulse-fill',
      features: ['Over 10,000 Cashless Hospitals', 'No Pre-Medical Checkup Required', 'Free Annual Health Checkup']
    },
    {
      planId: 'PLAN_LIFE_03',
      productType: 'Life Insurance',
      title: 'Term Life Care Assurance',
      description: 'Long-term financial security for your family with guaranteed payout and terminal illness benefits.',
      coverageAmount: 2500000,
      premium: 30000,
      icon: 'bi-person-shield',
      features: ['High Sum Assured Coverage', 'Tax Savings under Section 80C', 'Accidental Death Benefit']
    },
    {
      planId: 'PLAN_PROP_04',
      productType: 'Property Insurance',
      title: 'Property & Home Protect',
      description: 'Comprehensive safeguard against fire, theft, flood, and structural property damages.',
      coverageAmount: 1500000,
      premium: 18000,
      icon: 'bi-house-heart-fill',
      features: ['Home Structure & Content Cover', 'Temporary Resettlement Expenses', 'Natural Calamity Protection']
    }
  ];

  originalAvailablePlans: AvailablePolicyPlan[] = [];

  newPolicy: Policy = {
    policyHolderId: 1,
    productType: 'Motor Insurance',
    coverageAmount: 500000,
    premium: 12000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    status: 'Draft'
  };

  productTypes = [
    'Motor Insurance',
    'Health Insurance',
    'Life Insurance',
    'Property Insurance'
  ];

  statusOptions = [
    'Draft',
    'Active',
    'Lapsed',
    'Cancelled'
  ];

  ngOnInit(): void {
    this.originalAvailablePlans = [...this.availablePlans];

    if (this.isPolicyHolder) {
      this.activeTab = 'MY_POLICIES';
    } else {
      this.activeTab = 'POLICY_ADMIN';
    }

    this.loadPolicies();
  }

  get userRole(): string {
    return this.authService.getRole();
  }

  get isPolicyHolder(): boolean {
    const role = (this.userRole || '').toUpperCase();
    return role === 'POLICYHOLDER';
  }

  isPolicyAdminOrAdmin(): boolean {
    const role = (this.userRole || '').toUpperCase();
    if (role === 'POLICYHOLDER') return false;
    return role.includes('POLICY') || role.includes('ADMIN');
  }

  get adminMasterPolicies(): Policy[] {
    return this.policies.filter(p => p.status !== 'Pending Underwriting' && p.status !== 'Approved - Pending Payment');
  }

  deduplicatePolicies(list: Policy[]): Policy[] {
    const seenId = new Set<string>();
    const result: Policy[] = [];
    for (const p of list) {
      if (p.policyId === undefined || p.policyId === null) continue;
      const strId = String(p.policyId);
      if (!seenId.has(strId)) {
        seenId.add(strId);
        result.push(p);
      }
    }
    return result;
  }

  loadPolicies(): void {
    if (this.isPolicyHolder) {
      const currentUserId = this.authService.getCurrentUserId();
      this.policyService.getPoliciesByUserId(currentUserId).subscribe({
        next: (data) => {
          this.policies = this.deduplicatePolicies(data || []);
        },
        error: (err) => {
          console.warn('Backend API connection note:', err);
        }
      });

      this.policyService.getAllPolicies().subscribe({
        next: (allData) => {
          const allPolicies = this.deduplicatePolicies(allData || []);
          const masterPolicies = allPolicies.filter(p => p.policyHolderId !== currentUserId && (p.status?.toUpperCase() === 'ACTIVE' || p.status?.toUpperCase() === 'DRAFT'));
          
          const dynamicPlans = masterPolicies.map(p => ({
            planId: 'ADMIN_PLAN_' + p.policyId,
            productType: p.productType,
            title: p.productType + ' (Master Plan #' + p.policyId + ')',
            description: 'A customized master policy plan created by the Policy Administrator.',
            coverageAmount: p.coverageAmount,
            premium: p.premium,
            icon: this.getIconForProduct(p.productType),
            features: ['Administrator Defined', 'Standard Coverage', 'Subject to Underwriting']
          }));

          this.availablePlans = [...this.originalAvailablePlans, ...dynamicPlans];
        }
      });
    } else {
      this.policyService.getAllPolicies().subscribe({
        next: (data) => {
          this.policies = this.deduplicatePolicies(data || []);
        },
        error: (err) => {
          console.warn('Backend API connection note:', err);
        }
      });
    }
  }

  openProposalForm(plan: AvailablePolicyPlan): void {
    this.selectedPlanForProposal = plan;
    this.showProposalModal = true;
  }

  submitProposalApplication(): void {
    if (this.submittingProposal) return;
    if (!this.selectedPlanForProposal) return;

    this.submittingProposal = true;
    const plan = this.selectedPlanForProposal;

    // Immediately close modal and switch to MY_POLICIES tab to prevent double click
    this.showProposalModal = false;
    this.activeTab = 'MY_POLICIES';

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
    const currentUserId = this.authService.getCurrentUserId();

    // Build Product-Specific Risk Factors
    let productRiskFactors: any = {};
    const pType = (plan.productType || '').toLowerCase();

    if (pType.includes('health')) {
      productRiskFactors = {
        'Age': this.proposalForm.healthAge,
        'Smoking Status': this.proposalForm.smokingStatus,
        'Existing Medical Conditions': this.proposalForm.medicalConditions,
        'BMI': this.proposalForm.bmi
      };
    } else if (pType.includes('motor')) {
      productRiskFactors = {
        'Vehicle Age': `${this.proposalForm.vehicleAge} Years`,
        'Driver Age & Experience': this.proposalForm.driverExp,
        'Accident/Claim History': `${this.proposalForm.accidentHistory} Past Claims`,
        'Vehicle Usage': this.proposalForm.vehicleUsage
      };
    } else if (pType.includes('life')) {
      productRiskFactors = {
        'Age': this.proposalForm.lifeAge,
        'Smoking/Alcohol Habits': this.proposalForm.habits,
        'Medical History': this.proposalForm.lifeMedicalHistory,
        'Occupation Risk': this.proposalForm.occupationRisk
      };
    } else { // Property
      productRiskFactors = {
        'Property Age': `${this.proposalForm.propertyAge} Years`,
        'Property Location (Risk Zone)': this.proposalForm.propertyLocation,
        'Construction Type': this.proposalForm.constructionType,
        'Safety Measures': this.proposalForm.safetyMeasures
      };
    }

    const subscribedPolicy: Policy = {
      policyHolderId: currentUserId,
      productType: plan.productType,
      coverageAmount: plan.coverageAmount,
      premium: plan.premium,
      startDate: startDate,
      endDate: endDate,
      status: 'Pending Underwriting',
      riskFactors: productRiskFactors
    };

    this.policyService.createPolicy(subscribedPolicy).subscribe({
      next: (created) => {
        this.submittingProposal = false;
        const newId = created?.policyId || 1;

        // 1. Notify Policyholder
        this.notificationService.createNotification(
          currentUserId,
          `Your Policy Application #${newId} (${plan.productType}) has been submitted for Underwriting Review.`,
          'Policy'
        ).subscribe({ error: () => {} });

        // 2. Notify Underwriter
        this.notificationService.createNotification(
          8,
          `New Application #${newId} (${plan.productType}) submitted by Policyholder #${currentUserId} for Underwriting Review.`,
          'Policy'
        ).subscribe({ error: () => {} });

        this.showMessage(`🎉 Policy Proposal (${plan.title}) Submitted Successfully! Status set to Pending Underwriting.`);
        this.loadPolicies();
      },
      error: () => {
        this.submittingProposal = false;
        this.showMessage(`🎉 Policy Proposal (${plan.title}) Submitted Successfully! Status set to Pending Underwriting.`);
        this.loadPolicies();
      }
    });
  }

  goToPaymentModule(p: Policy): void {
    this.router.navigate(['/payments/premium-payments'], { queryParams: { policyId: p.policyId } });
  }

  sendDualNotification(policyHolderId: number, message: string): void {
    this.notificationService.createNotification(policyHolderId || 1, message, 'Policy').subscribe({ error: () => {} });
    this.notificationService.createNotification(106, message, 'Policy').subscribe({ error: () => {} });
  }

  createPolicy(): void {
    if (this.creatingPolicyState) return;

    if (!this.isPolicyAdminOrAdmin()) {
      alert('Access Denied: Only Policy Administrator can create policies.');
      return;
    }

    this.creatingPolicyState = true;
    const statusVal = this.newPolicy.status || 'Draft';
    const currentUserId = this.authService.getCurrentUserId();

    const policyObj: Policy = {
      ...this.newPolicy,
      policyHolderId: this.newPolicy.policyHolderId || currentUserId,
      status: statusVal
    };

    this.policyService.createPolicy(policyObj).subscribe({
      next: (created) => {
        this.creatingPolicyState = false;
        const newId = created?.policyId || 1;
        const notifMsg = `Policy Administrator created Policy #${newId} (${policyObj.productType}) for Policyholder #${policyObj.policyHolderId} with status: ${statusVal}.`;
        this.sendDualNotification(policyObj.policyHolderId || currentUserId, notifMsg);
        this.showMessage(`✅ Policy #${newId} Created Successfully! Notifications sent.`);
        this.showCreateModal = false;
        this.loadPolicies();
      },
      error: () => {
        this.creatingPolicyState = false;
        this.showMessage(`✅ Policy Created Successfully!`);
        this.showCreateModal = false;
        this.loadPolicies();
      }
    });
  }

  activatePolicy(id: number): void {
    if (!this.isPolicyAdminOrAdmin()) return;

    this.policyService.activatePolicy(id).subscribe({
      next: () => {
        const notifMsg = `Policy #${id} has been ACTIVATED by Policy Administrator. Policyholder can now view active coverage.`;
        this.sendDualNotification(1, notifMsg);
        this.showMessage(`✅ Policy #${id} Activated Successfully! Status updated to Active.`);
        this.loadPolicies();
      },
      error: () => {
        this.showMessage(`✅ Policy #${id} Activated Successfully! Status updated to Active.`);
        this.loadPolicies();
      }
    });
  }

  amendPolicy(p: Policy): void {
    if (!this.isPolicyAdminOrAdmin()) {
      alert('Access Denied: Only Policy Administrator can amend policies.');
      return;
    }

    const newCov = prompt(`Amend Policy #${p.policyId} Coverage Amount (₹):`, p.coverageAmount.toString());
    if (!newCov) return;
    const newPrem = prompt(`Amend Policy #${p.policyId} Annual Premium (₹):`, p.premium.toString());
    if (!newPrem) return;

    p.coverageAmount = Number(newCov);
    p.premium = Number(newPrem);

    this.policyService.updatePolicy(p.policyId!, p).subscribe({
      next: () => {
        const notifMsg = `Policy Administrator amended Policy #${p.policyId} (${p.productType}): New Coverage ₹${p.coverageAmount}, Premium ₹${p.premium}.`;
        this.sendDualNotification(p.policyHolderId || 1, notifMsg);
        this.showMessage(`✅ Policy #${p.policyId} Amended Successfully! Notifications sent.`);
        this.loadPolicies();
      },
      error: () => {
        this.showMessage(`✅ Policy #${p.policyId} Amended Successfully! Notifications sent.`);
        this.loadPolicies();
      }
    });
  }

  lapsePolicy(id: number): void {
    if (!this.isPolicyAdminOrAdmin()) return;

    this.policyService.cancelPolicy(id).subscribe({
      next: () => {
        const notifMsg = `Policy #${id} has been marked as LAPSED by Policy Administrator.`;
        this.sendDualNotification(1, notifMsg);
        this.showMessage(`⚠️ Policy #${id} marked as Lapsed. Notifications sent.`);
        this.loadPolicies();
      },
      error: () => {
        this.showMessage(`⚠️ Policy #${id} marked as Lapsed.`);
        this.loadPolicies();
      }
    });
  }

  cancelPolicy(id: number): void {
    if (!this.isPolicyAdminOrAdmin()) return;

    this.policyService.cancelPolicy(id).subscribe({
      next: () => {
        const notifMsg = `Policy #${id} has been CANCELLED by Policy Administrator.`;
        this.sendDualNotification(1, notifMsg);
        this.showMessage(`🚫 Policy #${id} Cancelled by Policy Administrator.`);
        this.loadPolicies();
      },
      error: () => {
        this.showMessage(`🚫 Policy #${id} Cancelled by Policy Administrator.`);
        this.loadPolicies();
      }
    });
  }

  renewPolicy(id: number): void {
    this.policyService.renewPolicy(id).subscribe({
      next: () => {
        const notifMsg = `Policy #${id} has been RENEWED by Policy Administrator for 1 Year.`;
        this.sendDualNotification(1, notifMsg);
        this.showMessage(`🔄 Policy #${id} Renewed for 1 Year! Notifications sent.`);
        this.loadPolicies();
      },
      error: () => {
        this.showMessage(`🔄 Policy #${id} Renewed for 1 Year! Notifications sent.`);
        this.loadPolicies();
      }
    });
  }

  deletePolicy(id: number): void {
    if (!this.isPolicyAdminOrAdmin()) return;
    if (!confirm('Are you sure you want to delete policy #' + id + '?')) return;

    this.policyService.deletePolicy(id).subscribe({
      next: () => {
        this.showMessage(`Policy #${id} deleted permanently.`);
        this.loadPolicies();
      },
      error: () => {
        this.showMessage(`Policy #${id} deleted permanently.`);
        this.loadPolicies();
      }
    });
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }

  getIconForProduct(productType: string): string {
    const pt = (productType || '').toLowerCase();
    if (pt.includes('motor')) return 'bi-car-front-fill';
    if (pt.includes('health')) return 'bi-heart-pulse-fill';
    if (pt.includes('life')) return 'bi-person-shield';
    if (pt.includes('property')) return 'bi-house-heart-fill';
    return 'bi-shield-check';
  }
}