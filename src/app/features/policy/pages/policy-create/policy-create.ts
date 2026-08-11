import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PolicyService } from '../../services/policy.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../notifications/services/notification.service';
import { Policy } from '../../models/policy.model';

@Component({
  selector: 'app-policy-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './policy-create.html',
  styleUrls: ['./policy-create.css']
})
export class PolicyCreateComponent implements OnInit {

  private policyService = inject(PolicyService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  policy: Policy = {
    policyHolderId: 1,
    productType: 'Motor Insurance',
    coverageAmount: 500000,
    premium: 12000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    status: 'Draft'
  };

  submitting = false;

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
    if (!this.isPolicyAdminOrAdmin()) {
      alert('Access Denied: Only Policy Administrator can create policies.');
      this.router.navigate(['/policies']);
    }
  }

  isPolicyAdminOrAdmin(): boolean {
    const role = this.authService.getRole();
    return role === 'POLICY_ADMIN' || role === 'ADMIN';
  }

  sendNotification(policyHolderId: number, message: string): void {
    this.notificationService.createNotification(policyHolderId || 1, message, 'Policy').subscribe({ error: () => {} });
  }

  createPolicy(): void {
    if (this.submitting) return;

    const covAmt = Number(this.policy.coverageAmount);
    const prem = Number(this.policy.premium);

    if (!covAmt || !prem || covAmt <= 0 || prem <= 0) {
      alert('Please enter valid Coverage Amount and Annual Premium details.');
      return;
    }

    this.submitting = true;
    const statusVal = this.policy.status || 'Draft';
    const currentUserId = this.authService.getCurrentUserId();

    const policyObj: Policy = {
      ...this.policy,
      coverageAmount: covAmt,
      premium: prem,
      policyHolderId: currentUserId, // Master policy belongs to the Admin
      status: statusVal
    };

    this.policyService.createPolicy(policyObj).subscribe({
      next: (created) => {
        this.submitting = false;
        const newId = created?.policyId || 1;
        const notifMsg = `Policy Administrator created Policy #${newId} (${policyObj.productType}) for Policyholder #${policyObj.policyHolderId} with status: ${statusVal}.`;
        this.sendNotification(policyObj.policyHolderId || currentUserId, notifMsg);
        
        // Pass success message to the policy list page via router state
        this.router.navigate(['/policies'], { state: { message: `✅ Policy #${newId} Created Successfully! Notifications sent.` } });
      },
      error: (err) => {
        this.submitting = false;
        console.error('Backend Policy Creation Error:', err);
        alert(`❌ Failed to create policy. Please try again.`);
      }
    });
  }
}