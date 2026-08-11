import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PolicyService } from '../../services/policy.service';
import { Policy } from '../../models/policy.model';
import { NotificationService } from '../../../notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-policy-edit',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './policy-edit.html',
  styleUrls: ['./policy-edit.css']
})
export class PolicyEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private policyService = inject(PolicyService);
  private notificationService = inject(NotificationService);
  public authService = inject(AuthService);

  policyId: number = 0;
  policy: Policy | null = null;
  message = '';
  loading = true;
  
  allPolicies: Policy[] = [];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.policyId = Number(params.get('id'));
      this.loadPolicyData();
    });
  }

  loadPolicyData() {
    this.loading = true;
    this.policyService.getAllPolicies().subscribe({
      next: (policies) => {
        this.allPolicies = policies || [];
        if (this.policyId >= 101 && this.policyId <= 104) {
            this.policy = {
                policyId: this.policyId,
                policyHolderId: this.authService.getCurrentUserId(),
                productType: 'Standard Inbuilt Plan (Placeholder)',
                coverageAmount: 0,
                premium: 0,
                startDate: '', endDate: '', status: 'Active'
            };
        } else {
            this.policy = this.allPolicies.find(p => p.policyId === this.policyId) || null;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get subscribedPoliciesList(): Policy[] {
    const adminId = this.authService.getCurrentUserId();
    return this.allPolicies.filter(p => p.policyHolderId !== adminId);
  }

  sendNotification(policyHolderId: number, message: string): void {
    this.notificationService.createNotification(policyHolderId || 1, message, 'Policy').subscribe({ error: () => {} });
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }

  activatePolicy(): void {
    if (!this.policy) return;
    const targetProductType = this.policy.productType;
    
    if (this.policy.policyId! < 101 || this.policy.policyId! > 104) {
      this.policyService.activatePolicy(this.policy.policyId!).subscribe();
    }
    this.showMessage(`✅ Master Policy Activated.`);
    this.policy.status = 'Active';

    const subscribed = this.subscribedPoliciesList.filter(p => p.productType === targetProductType);
      subscribed.forEach(subPolicy => {
         this.sendNotification(subPolicy.policyHolderId!, `Your ${targetProductType} policy (ID: #${subPolicy.policyId}) Master Plan has been Activated by the Administrator.`);
      });
  }

  cancelPolicy(): void {
    if (!this.policy) return;
    const targetProductType = this.policy.productType;
    
    if (this.policy.policyId! < 101 || this.policy.policyId! > 104) {
      this.policyService.cancelPolicy(this.policy.policyId!).subscribe();
    }
    this.showMessage(`🚫 Master Policy Cancelled. Cascading to subscriptions...`);
    this.policy.status = 'Cancelled';

    const subscribedToCancel = this.subscribedPoliciesList.filter(p => p.productType === targetProductType && p.status !== 'Cancelled' && p.status !== 'CANCELLED');
    subscribedToCancel.forEach(subPolicy => {
       this.policyService.cancelPolicy(subPolicy.policyId!).subscribe({
           next: () => {
             this.sendNotification(subPolicy.policyHolderId!, `Your ${targetProductType} policy (ID: #${subPolicy.policyId}) has been cancelled by the Administrator because the Master Policy was cancelled.`);
           }
       });
    });
  }

  renewPolicy(): void {
    if (!this.policy) return;
    const targetProductType = this.policy.productType;
    
    if (this.policy.policyId! < 101 || this.policy.policyId! > 104) {
      this.policyService.renewPolicy(this.policy.policyId!).subscribe();
    }
    this.showMessage(`🔄 Master Policy Renewed.`);
    this.policy.status = 'Active';

    const subscribed = this.subscribedPoliciesList.filter(p => p.productType === targetProductType);
      subscribed.forEach(subPolicy => {
         this.sendNotification(subPolicy.policyHolderId!, `Your ${targetProductType} policy (ID: #${subPolicy.policyId}) Master Plan has been Renewed by the Administrator.`);
      });
  }

  goBack(): void {
    this.router.navigate(['/policies']);
  }
}
