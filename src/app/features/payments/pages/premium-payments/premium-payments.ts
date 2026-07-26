import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { PaymentsService } from '../../service/payments.service';
import { Policy } from '../../../policy/models/policy.model';
import { NotificationService } from '../../../notifications/services/notification.service';

export interface PaymentScheduleItem {
  paymentId: number;
  policyId: number;
  productType: string;
  amount: number;
  paymentDate: string;
  method: 'Card' | 'BankTransfer' | 'Cheque';
  status: 'PENDING' | 'RECEIVED' | 'OVERDUE';
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

  private readonly POLICIES_KEY = 'claimedge_clean_policies_master_v12';

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['policyId']) {
        this.targetPolicyIdFromQuery = Number(params['policyId']);
      }
      this.loadDueInvoicesAndPayments();
    });
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

  loadDueInvoicesAndPayments(): void {
    const allPolicies = this.getMasterPolicies();

    this.duePolicyInvoices = allPolicies.filter(p => {
      const st = (p.status || '').toUpperCase();
      return st.includes('APPROVED') || st.includes('PENDING PAYMENT') || (this.targetPolicyIdFromQuery && Number(p.policyId) === this.targetPolicyIdFromQuery);
    });

    const basePayments: PaymentScheduleItem[] = this.duePolicyInvoices.map((p, idx) => ({
      paymentId: 5001 + idx,
      policyId: p.policyId!,
      productType: p.productType,
      amount: p.premium,
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'Card',
      status: (p.status === 'Active') ? 'RECEIVED' : 'PENDING'
    }));

    if (basePayments.length === 0) {
      basePayments.push({
        paymentId: 5000,
        policyId: 101,
        productType: 'Motor Insurance',
        amount: 15000,
        paymentDate: '2026-07-25',
        method: 'Card',
        status: 'RECEIVED'
      });
    }

    this.payments = basePayments;
    this.filterPayments();
  }

  processSchedulePayment(inv: Policy, method: string): void {
    const master = this.getMasterPolicies();
    const updated = master.map(item => {
      if (String(item.policyId) === String(inv.policyId)) {
        return { ...item, status: 'Active' }; // Transits to ACTIVE only after successful payment
      }
      return item;
    });

    this.saveMasterPolicies(updated);

    const notifMsg = `Premium Payment of ₹${inv.premium} via ${method} RECEIVED for Policy #${inv.policyId}. Policy status is now ACTIVE.`;

    // 1. Send Notification to Policyholder
    this.notificationService.createNotification(
      inv.policyHolderId || 101,
      notifMsg,
      'Payment'
    ).subscribe({ error: () => {} });

    // 2. Send Notification to Policy Administrator (UserId: 106)
    this.notificationService.createNotification(
      106,
      notifMsg,
      'Payment'
    ).subscribe({ error: () => {} });

    this.showMessage(`🎉 Payment of ₹${inv.premium} RECEIVED via ${method}! Policy #${inv.policyId} is now ACTIVE.`);
    this.loadDueInvoicesAndPayments();
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

  viewPayment(paymentId: number): void {
    this.router.navigate(['/payments/payment-details', paymentId]);
  }

  showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => this.message = '', 3500);
  }
}