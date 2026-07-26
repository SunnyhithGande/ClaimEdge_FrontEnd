import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PaymentsService } from '../../service/payments.service';

@Component({
  selector: 'app-process-disbursement',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './process-disbursement.html',
  styleUrl: './process-disbursement.css'
})
export class ProcessDisbursementComponent {

  disbursementId = '';

  processedData: any = null;

  constructor(
    private paymentsService: PaymentsService
  ) {}

  processDisbursement(): void {

    if (!this.disbursementId) {

      alert('Enter Disbursement ID');

      return;
    }

    this.paymentsService
      .processDisbursement(
        Number(this.disbursementId)
      )
      .subscribe({

        next: (response) => {

          console.log(response);

          this.processedData = response;

          alert(
            'Disbursement Processed Successfully'
          );

        },

        error: (error) => {

          console.error(error);

          alert(
            'Failed To Process Disbursement'
          );

        }

      });

  }

}