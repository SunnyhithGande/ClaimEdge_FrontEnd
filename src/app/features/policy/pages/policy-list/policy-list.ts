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
  status?: string;
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
  showProposalModal = false;
  submittingProposal = false;

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

  productTypes = [
    'Motor Insurance',
    'Health Insurance',
    'Life Insurance',
    'Property Insurance'
  ];

  statusOptions = [
    'Draft',
    'Active'
  ];

  ngOnInit(): void {
    this.originalAvailablePlans = [...this.availablePlans];

    if (this.isPolicyHolder) {
      this.activeTab = 'MY_POLICIES';
    } else if (this.isPolicyAdminOrAdmin()) {
      this.activeTab = 'POLICY_ADMIN';
    } else {
      this.activeTab = 'POLICY_HOLDERS';
    }

    // Read success message from router state if coming from Create Policy
    if (history.state?.message) {
      this.showMessage(history.state.message);
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
    const adminId = this.authService.getCurrentUserId();
    
    const inbuiltPolicies: Policy[] = this.originalAvailablePlans.map((plan, index) => {
      const p: any = {
        policyId: 101 + index, // IDs 101, 102, 103, 104
        displayId: 101 + index,
        policyHolderId: adminId,
        productType: plan.productType,
        coverageAmount: plan.coverageAmount,
        premium: plan.premium,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        status: plan.status || 'Active'
      };
      p.isMasterPlan = true;
      return p;
    });

    // 2. Admin created policies from DB
    const adminCreated = this.policies.filter(p => p.policyHolderId === adminId);
    
    const mappedAdminCreated = adminCreated.map((p) => {
      const mapped = { ...p } as any;
      mapped.displayId = p.policyId;
      return mapped;
    });

    return [...inbuiltPolicies, ...mappedAdminCreated];
  }

  // --- Search & Pagination Logic ---
  adminSearchTerm = '';
  holdersSearchTerm = '';

  adminCurrentPage = 1;
  adminPageSize = 5;

  holdersCurrentPage = 1;
  holdersPageSize = 5;

  get filteredAdminPolicies(): Policy[] {
    if (!this.adminSearchTerm) return this.adminMasterPolicies;
    const term = this.adminSearchTerm.toLowerCase();
    return this.adminMasterPolicies.filter((p: any) => 
      String(p.displayId || p.policyId).includes(term) || (p.productType && p.productType.toLowerCase().includes(term))
    );
  }

  get paginatedAdminPolicies(): Policy[] {
    const start = (this.adminCurrentPage - 1) * this.adminPageSize;
    return this.filteredAdminPolicies.slice(start, start + this.adminPageSize);
  }

  get adminTotalPages(): number {
    return Math.ceil(this.filteredAdminPolicies.length / this.adminPageSize) || 1;
  }

  get filteredSubscribedPolicies(): Policy[] {
    if (!this.holdersSearchTerm) return this.subscribedPoliciesList;
    const term = this.holdersSearchTerm.toLowerCase();
    return this.subscribedPoliciesList.filter(p => 
      String(p.policyHolderId).includes(term) || (p.productType && p.productType.toLowerCase().includes(term))
    );
  }

  get paginatedSubscribedPolicies(): Policy[] {
    const start = (this.holdersCurrentPage - 1) * this.holdersPageSize;
    return this.filteredSubscribedPolicies.slice(start, start + this.holdersPageSize);
  }

  get holdersTotalPages(): number {
    return Math.ceil(this.filteredSubscribedPolicies.length / this.holdersPageSize) || 1;
  }
  // ------------------------

  get subscribedPoliciesList(): Policy[] {
    const adminId = this.authService.getCurrentUserId();
    const masters = this.adminMasterPolicies;

    return this.policies.filter(p => {
      if (p.policyHolderId === adminId) return false;
      const s = (p.status || '').toUpperCase();
      // Only show policies that have completed the application process (Active, Cancelled, Lapsed)
      return s === 'ACTIVE' || s === 'CANCELLED' || s === 'LAPSED';
    }).map(p => {
      const mapped = { ...p };
      const matchingMasters = masters.filter(m => m.productType === p.productType);
      if (matchingMasters.length > 0) {
        const matchingMaster = matchingMasters[matchingMasters.length - 1];
        mapped.displayId = matchingMaster.displayId || matchingMaster.policyId;
      }
      return mapped;
    });
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
          const masterPolicies = allPolicies.filter(p => 
            p.policyHolderId !== currentUserId && 
            p.status?.toUpperCase() === 'ACTIVE' &&
            (!p.riskFactors || Object.keys(p.riskFactors).length === 0)
          );
          
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

        this.showMessage(`🎉 Policy Proposal (${plan.title}) Submitted Successfully! Status set to Pending Underwriting.`);
        this.loadPolicies();
      },
      error: () => {
        this.submittingProposal = false;
        this.showMessage(`❌ Failed to submit proposal. Please try again.`);
      }
    });
  }

  goToPaymentModule(p: Policy): void {
    this.router.navigate(['/payments/premium-payments'], { queryParams: { policyId: p.policyId } });
  }

  sendNotification(policyHolderId: number, message: string): void {
    this.notificationService.createNotification(policyHolderId || 1, message, 'Policy').subscribe({ error: () => {} });
  }

  activatePolicy(id: number): void {
    if (!this.isPolicyAdminOrAdmin()) return;

    this.policyService.activatePolicy(id).subscribe({
      next: () => {
        const holderId = this.policies.find(p => p.policyId === id)?.policyHolderId || 1;
        const notifMsg = `Policy #${id} has been ACTIVATED by Policy Administrator. Policyholder can now view active coverage.`;
        this.sendNotification(holderId, notifMsg);
        this.showMessage(`✅ Policy #${id} Activated Successfully! Status updated to Active.`);
        this.loadPolicies();
      },
      error: () => {
        this.showMessage(`❌ Failed to activate policy. Please try again.`);
      }
    });
  }

  cancelPolicy(id: number): void {
    if (!this.isPolicyAdminOrAdmin()) return;

    this.policyService.cancelPolicy(id).subscribe({
      next: () => {
        const holderId = this.policies.find(p => p.policyId === id)?.policyHolderId || 1;
        const notifMsg = `Policy #${id} has been CANCELLED by Policy Administrator.`;
        this.sendNotification(holderId, notifMsg);
        this.showMessage(`🚫 Policy #${id} Cancelled by Policy Administrator.`);
        this.loadPolicies();
      },
      error: () => {
        this.showMessage(`❌ Failed to cancel policy. Please try again.`);
      }
    });
  }

  renewPolicy(id: number): void {
    this.policyService.renewPolicy(id).subscribe({
      next: () => {
        const holderId = this.policies.find(p => p.policyId === id)?.policyHolderId || 1;
        const notifMsg = `Policy #${id} has been RENEWED by Policy Administrator for 1 Year.`;
        this.sendNotification(holderId, notifMsg);
        this.showMessage(`🔄 Policy #${id} Renewed for 1 Year! Notifications sent.`);
        this.loadPolicies();
      },
      error: () => {
        this.showMessage(`❌ Failed to renew policy. Please try again.`);
      }
    });
  }

  activateMasterPolicy(p: any): void {
    if (!this.isPolicyAdminOrAdmin()) return;
    let targetProductType = '';
    
    if (p.isMasterPlan) {
      const index = p.policyId - 1;
      this.originalAvailablePlans[index].status = 'Active';
      targetProductType = this.originalAvailablePlans[index].productType;
      this.showMessage(`✅ Master Policy Activated.`);
    } else {
      targetProductType = p.productType;
      this.policyService.activatePolicy(p.policyId).subscribe();
      this.showMessage(`✅ Master Policy Activated.`);
    }

    if (targetProductType) {
      const subscribed = this.subscribedPoliciesList.filter(p => p.productType === targetProductType);
      subscribed.forEach(subPolicy => {
         this.sendNotification(subPolicy.policyHolderId, `Your ${targetProductType} policy (ID: #${subPolicy.policyId}) Master Plan has been Activated by the Administrator.`);
      });
    }
    setTimeout(() => this.loadPolicies(), 1000);
  }

  renewMasterPolicy(p: any): void {
    if (!this.isPolicyAdminOrAdmin()) return;
    let targetProductType = '';
    
    if (p.isMasterPlan) {
      const index = p.policyId - 1;
      this.originalAvailablePlans[index].status = 'Active';
      targetProductType = this.originalAvailablePlans[index].productType;
      this.showMessage(`🔄 Master Policy Renewed.`);
    } else {
      targetProductType = p.productType;
      this.policyService.renewPolicy(p.policyId).subscribe();
      this.showMessage(`🔄 Master Policy Renewed.`);
    }

    if (targetProductType) {
      const subscribed = this.subscribedPoliciesList.filter(p => p.productType === targetProductType);
      subscribed.forEach(subPolicy => {
         this.sendNotification(subPolicy.policyHolderId, `Your ${targetProductType} policy (ID: #${subPolicy.policyId}) Master Plan has been Renewed by the Administrator.`);
      });
    }
    setTimeout(() => this.loadPolicies(), 1000);
  }

  cancelMasterPolicy(p: any): void {
    if (!this.isPolicyAdminOrAdmin()) return;
    let targetProductType = '';
    
    if (p.isMasterPlan) {
      const index = p.policyId - 1;
      this.originalAvailablePlans[index].status = 'Cancelled';
      targetProductType = this.originalAvailablePlans[index].productType;
      this.showMessage(`🚫 Master Policy (${targetProductType}) Cancelled. Cascading to all subscriptions...`);
    } else {
      targetProductType = p.productType;
      this.policyService.cancelPolicy(p.policyId).subscribe();
      this.showMessage(`🚫 Master Policy #${p.displayId || p.policyId} Cancelled. Cascading to all subscriptions...`);
    }

    if (targetProductType) {
      const subscribedToCancel = this.subscribedPoliciesList.filter(p => p.productType === targetProductType && p.status !== 'Cancelled' && p.status !== 'CANCELLED');
      subscribedToCancel.forEach(subPolicy => {
         this.policyService.cancelPolicy(subPolicy.policyId!).subscribe({
           next: () => {
             this.sendNotification(subPolicy.policyHolderId, `Your ${targetProductType} policy (ID: #${subPolicy.policyId}) has been cancelled by the Administrator because the Master Policy was cancelled.`);
           }
         });
      });
    }
    
    setTimeout(() => this.loadPolicies(), 1000);
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