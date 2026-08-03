import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { PaymentsService } from '../../service/payments.service';

@Component({
  selector: 'app-payment-details',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './payment-details.html',
  styleUrl: './payment-details.css'
})
export class PaymentDetailsComponent implements OnInit {

  payment: any = null;

  constructor(
    private route: ActivatedRoute,
    private paymentsService: PaymentsService
  ) {}

  ngOnInit(): void {

    const paymentId = Number(this.route.snapshot.paramMap.get('id'));
    const state = history.state;

    if (state && state.payment) {
      this.payment = state.payment;
      // Map method to paymentMethod for the HTML template
      if (!this.payment.paymentMethod && this.payment.method) {
        this.payment.paymentMethod = this.payment.method;
      }
    } else {
      this.loadPayment(paymentId);
    }

  }

  loadPayment(paymentId: number): void {

    this.paymentsService
      .getPaymentById(paymentId)
      .subscribe({

        next: (response) => {

          console.log(response);

          this.payment = response;

        },

        error: (error) => {

          console.error(error);

          alert('Payment not found');

        }

      });

  }

  markOverdue(): void {

    this.paymentsService
      .markOverdue(this.payment.paymentId)
      .subscribe({

        next: (response) => {

          this.payment = response;

          alert('Payment Marked Overdue');

        },

        error: (error) => {

          console.error(error);

        }

      });

  }

}