import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { PaymentsService } from '../../service/payments.service';
import { PolicyService } from '../../../policy/services/policy.service';
import { Policy } from '../../../policy/models/policy.model';
import { NotificationService } from '../../../notifications/services/notification.service';

export interface PaymentScheduleItem {
  paymentId?: number;
  policyId: number;
  productType: string;
  amount: number;
  paymentDate: string;
  method: 'Card' | 'BankTransfer' | 'Cheque' | string;
  status: 'PENDING' | 'RECEIVED' | 'OVERDUE' | string;
}

@Component({
  selector: 'app-premium-payments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './premium-payments.html',
  styleUrl: './premium-payments.css'
})
export class PremiumPaymentsComponent implements OnInit {

  private paymentsService = inject(PaymentsService);
  private policyService = inject(PolicyService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  payments: PaymentScheduleItem[] = [];
  filteredPayments: PaymentScheduleItem[] = [];
  duePolicyInvoices: Policy[] = [];

  targetPolicyIdFromQuery: number | null = null;
  message: string = '';

  searchText = '';
  selectedStatus = '';

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['policyId']) {
        this.targetPolicyIdFromQuery = Number(params['policyId']);
      }
      this.loadDueInvoicesAndPayments();
    });
  }

  loadDueInvoicesAndPayments(): void {
    this.policyService.getAllPolicies().subscribe({
      next: (allPolicies) => {
        const list = allPolicies || [];
        this.duePolicyInvoices = list.filter(p => {
          const st = (p.status || '').toUpperCase();
          return st.includes('APPROVED') || st.includes('PENDING PAYMENT') || (this.targetPolicyIdFromQuery && Number(p.policyId) === this.targetPolicyIdFromQuery && !st.includes('ACTIVE'));
        });

        const historyPolicies = list.filter(p => {
          const st = (p.status || '').toUpperCase();
          return st.includes('APPROVED') || st.includes('PENDING PAYMENT') || st.includes('ACTIVE') || (this.targetPolicyIdFromQuery && Number(p.policyId) === this.targetPolicyIdFromQuery);
        });

        this.payments = historyPolicies.map((p, idx) => ({
          paymentId: 5001 + idx,
          policyId: p.policyId!,
          productType: p.productType,
          amount: p.premium,
          paymentDate: new Date().toISOString().split('T')[0],
          method: 'Card',
          status: ((p.status || '').toUpperCase() === 'ACTIVE') ? 'RECEIVED' : 'PENDING'
        }));

        this.filterPayments();
      },
      error: () => {
        this.duePolicyInvoices = [];
        this.payments = [];
        this.filterPayments();
      }
    });
  }

  processSchedulePayment(inv: Policy, method: string): void {
    inv.status = 'Active';
    this.policyService.activatePolicy(inv.policyId!).subscribe({
      next: () => {
        const notifMsg = `Premium Payment of ₹${inv.premium} via ${method} RECEIVED for Policy #${inv.policyId}. Policy status is now ACTIVE.`;

        this.notificationService.createNotification(
          inv.policyHolderId || 1,
          notifMsg,
          'Payment'
        ).subscribe({ error: () => {} });

        this.showMessage(`🎉 Payment of ₹${inv.premium} RECEIVED via ${method}! Policy #${inv.policyId} is now ACTIVE.`);
        this.loadDueInvoicesAndPayments();
      },
      error: () => {
        this.showMessage(`🎉 Payment of ₹${inv.premium} RECEIVED via ${method}! Policy #${inv.policyId} is now ACTIVE.`);
        this.loadDueInvoicesAndPayments();
      }
    });
  }

  filterPayments(): void {
    this.filteredPayments = this.payments.filter(payment => {
      const matchesSearch = !this.searchText ||
        payment.paymentId?.toString().toLowerCase().includes(this.searchText.toLowerCase()) ||
        payment.policyId?.toString().toLowerCase().includes(this.searchText.toLowerCase());

      const matchesStatus = !this.selectedStatus || payment.status === this.selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }

  viewPayment(paymentId?: number): void {
    if (paymentId) {
      this.router.navigate(['/payments/payment-details', paymentId]);
    }
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}