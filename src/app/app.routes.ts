import { Routes } from '@angular/router';

import { Login } from './core/auth/pages/login/login';
import { Register } from './core/auth/pages/register/register';

import { DashboardComponent } from './features/dashboard/pages/dashboard/dashboard';
import { IdentityManagementComponent } from './features/identity/pages/identity-management/identity-management';

import { PolicyListComponent } from './features/policy/pages/policy-list/policy-list';
import { PolicyCreateComponent } from './features/policy/pages/policy-create/policy-create';
import { EndorsementsComponent } from './features/policy/pages/endorsements/endorsements';

import { UnderwritingListComponent } from './features/underwriting/pages/underwriting-list/underwriting-list';

import { ClaimsListComponent } from './features/claim/pages/claims-list/claims-list';
import { CreateClaimComponent } from './features/claim/pages/create-claim/create-claim';
import { AssessmentsComponent } from './features/claim/pages/assessments/assessments';
import { ClaimDetailsComponent } from './features/claim/pages/claim-details/claim-details';
import { TimelineComponent } from './features/claim/pages/timeline/timeline';

import { PremiumPaymentsComponent } from './features/payments/pages/premium-payments/premium-payments';
import { CollectPremiumComponent } from './features/payments/pages/collect-premium/collect-premium';
import { PaymentDetailsComponent } from './features/payments/pages/payment-details/payment-details';
import { DisbursementsComponent } from './features/payments/pages/disbursements/disbursements';
import { InitiateDisbursementComponent } from './features/payments/pages/initiate-disbursement/initiate-disbursement';
import { ProcessDisbursementComponent } from './features/payments/pages/process-disbursement/process-disbursement';

import { FraudListComponent } from './features/fraud/pages/fraud-list/fraud-list';
import { ComplianceListComponent } from './features/compliance/pages/compliance-list/compliance-list';
import { AnalyticsDashboardComponent } from './features/analytics/pages/analytics-dashboard/analytics-dashboard';
import { NotificationsListComponent } from './features/notifications/pages/notifications-list/notifications-list';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'identity-management',
    component: IdentityManagementComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['ADMIN', 'COMPLIANCE'] }
  },
  {
    path: 'policies',
    component: PolicyListComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['POLICYHOLDER', 'POLICY_ADMIN', 'UNDERWRITER', 'ADMIN'] }
  },
  {
    path: 'policies/create',
    component: PolicyCreateComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['POLICYHOLDER', 'POLICY_ADMIN', 'ADMIN'] }
  },
  {
    path: 'policies/endorsements',
    component: EndorsementsComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['POLICYHOLDER', 'POLICY_ADMIN', 'UNDERWRITER', 'ADMIN'] }
  },
  {
    path: 'underwriting',
    component: UnderwritingListComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['UNDERWRITER', 'ADMIN'] }
  },
  {
    path: 'claims/list',
    component: ClaimsListComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['POLICYHOLDER', 'ADJUSTER', 'FRAUD_ANALYST', 'OPERATIONS', 'ADMIN'] }
  },
  {
    path: 'claims/create',
    component: CreateClaimComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['POLICYHOLDER', 'ADMIN'] }
  },
  {
    path: 'claims/assessments',
    component: AssessmentsComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['ADJUSTER', 'ADMIN'] }
  },
  {
    path: 'claims/details/:id',
    component: ClaimDetailsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'claims/timeline',
    component: TimelineComponent,
    canActivate: [authGuard]
  },
  {
    path: 'payments/premium-payments',
    component: PremiumPaymentsComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['POLICYHOLDER', 'ADJUSTER', 'ADMIN'] }
  },
  {
    path: 'payments/collect-premium',
    component: CollectPremiumComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['POLICYHOLDER', 'ADMIN'] }
  },
  {
    path: 'payments/payment-details/:id',
    component: PaymentDetailsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'payments/disbursements',
    component: DisbursementsComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['ADJUSTER', 'ADMIN'] }
  },
  {
    path: 'payments/initiate-disbursement',
    component: InitiateDisbursementComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['ADJUSTER', 'ADMIN'] }
  },
  {
    path: 'payments/process-disbursement',
    component: ProcessDisbursementComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['ADJUSTER', 'ADMIN'] }
  },
  {
    path: 'fraud-detection',
    component: FraudListComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['FRAUD_ANALYST', 'COMPLIANCE', 'OPERATIONS', 'ADMIN'] }
  },
  {
    path: 'compliance',
    component: ComplianceListComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['COMPLIANCE', 'ADMIN'] }
  },
  {
    path: 'analytics',
    component: AnalyticsDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['OPERATIONS_ANALYST', 'OPERATIONS', 'UNDERWRITER', 'COMPLIANCE', 'ADMIN'] }
  },
  {
    path: 'notifications',
    component: NotificationsListComponent,
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];