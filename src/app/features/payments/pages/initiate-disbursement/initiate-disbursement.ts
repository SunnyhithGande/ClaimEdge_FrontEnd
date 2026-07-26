import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PaymentsService } from '../../service/payments.service';

@Component({
  selector: 'app-initiate-disbursement',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './initiate-disbursement.html',
  styleUrl: './initiate-disbursement.css'
})
export class InitiateDisbursementComponent {

  disbursementData = {
    claimId: '',
    amount: '',
    disbursementDate: ''
  };

  constructor(
    private paymentsService: PaymentsService
  ) {}

  initiateDisbursement(): void {

    const payload = {

      disbursementId: null,

      claimId: Number(
        this.disbursementData.claimId
      ),

      amount: Number(
        this.disbursementData.amount
      ),

      disbursementDate:
        this.disbursementData.disbursementDate,

      status: 'PENDING'

    };

    console.log(payload);

    this.paymentsService
      .initiateDisbursement(payload)
      .subscribe({

        next: (response) => {

          console.log(response);

          alert(
            'Disbursement Initiated Successfully'
          );

          this.resetForm();

        },

        error: (error) => {

          console.error(error);

          alert(
            'Failed To Initiate Disbursement'
          );

        }

      });

  }

  resetForm(): void {

    this.disbursementData = {

      claimId: '',
      amount: '',
      disbursementDate: ''

    };

  }

}