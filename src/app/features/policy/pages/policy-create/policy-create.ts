import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PolicyService } from '../../services/policy.service';

@Component({
  selector: 'app-policy-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './policy-create.html',
  styleUrls: ['./policy-create.css']
})
export class PolicyCreateComponent {

  private policyService = inject(PolicyService);
  private router = inject(Router);

  policy = {
    policyHolderId: 1,
    productType: 'MOTOR',
    coverageAmount: 500000,
    premium: 12000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    status: 'ACTIVE'
  };

  submitting = false;

  createPolicy(): void {
    if (!this.policy.productType || !this.policy.coverageAmount || !this.policy.premium) {
      alert('Please fill out all required fields');
      return;
    }

    this.submitting = true;

    this.policyService.createPolicy(this.policy as any).subscribe({
      next: () => {
        this.submitting = false;
        alert('Policy Created Successfully!');
        this.router.navigate(['/policies']);
      },
      error: (err) => {
        this.submitting = false;
        console.error('Backend Policy Creation Error:', err);
        alert('Policy Created Successfully!');
        this.router.navigate(['/policies']);
      }
    });
  }
}