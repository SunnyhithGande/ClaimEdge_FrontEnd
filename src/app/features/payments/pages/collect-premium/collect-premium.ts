import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PaymentsService } from '../../service/payments.service';

@Component({
  selector: 'app-collect-premium',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './collect-premium.html',
  styleUrl: './collect-premium.css'
})
export class CollectPremiumComponent {

  paymentData = {

    policyId: '',

    amount: '',

    paymentMethod: '',

    paymentDate: '',

    notes: ''

  };

  constructor(
    private paymentsService: PaymentsService
  ) {}

  collectPremium(): void {

    const payload = {

      policyId: Number(
        this.paymentData.policyId
      ),

      amount: Number(
        this.paymentData.amount
      ),

      paymentMethod:
        this.paymentData.paymentMethod,

      paymentDate:
        this.paymentData.paymentDate,

      notes:
        this.paymentData.notes

    };

    console.log(payload);

    this.paymentsService
      .collectPremium(payload)
      .subscribe({

        next: (response) => {

          console.log(response);

          alert(
            'Premium Collected Successfully'
          );

          this.resetForm();

        },

        error: (error) => {

          console.error(error);

          alert(
            'Failed to Collect Premium'
          );

        }

      });

  }

  resetForm(): void {

    this.paymentData = {

      policyId: '',

      amount: '',

      paymentMethod: '',

      paymentDate: '',

      notes: ''

    };

  }

}