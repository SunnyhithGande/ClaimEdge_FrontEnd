import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {

  private paymentsUrl =
    `${environment.apiUrl}/payments`;

  private disbursementsUrl =
    `${environment.apiUrl}/disbursements`;

  constructor(
    private http: HttpClient
  ) {}

  // =====================================
  // PREMIUM PAYMENTS
  // =====================================

  collectPremium(
    paymentData: any
  ): Observable<any> {

    return this.http.post(
      `${this.paymentsUrl}/collect`,
      paymentData
    );

  }

  getAllPayments(): Observable<any> {

    return this.http.get(
      this.paymentsUrl
    );

  }

  getPaymentById(
    id: number
  ): Observable<any> {

    return this.http.get(
      `${this.paymentsUrl}/${id}`
    );

  }

  getPaymentsByPolicy(
    policyId: number
  ): Observable<any> {

    return this.http.get(
      `${this.paymentsUrl}/policy/${policyId}`
    );

  }

  getOutstandingPayments(): Observable<any> {

    return this.http.get(
      `${this.paymentsUrl}/outstanding`
    );

  }

  markOverdue(
    id: number
  ): Observable<any> {

    return this.http.patch(
      `${this.paymentsUrl}/${id}/mark-overdue`,
      {}
    );

  }

  refundPayment(
    id: number
  ): Observable<any> {

    return this.http.post(
      `${this.paymentsUrl}/${id}/refund`,
      {}
    );

  }

  deletePayment(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.paymentsUrl}/${id}`
    );

  }

  // =====================================
  // CLAIM DISBURSEMENTS
  // =====================================

  initiateDisbursement(
    disbursementData: any
  ): Observable<any> {

    return this.http.post(
      `${this.disbursementsUrl}/initiate`,
      disbursementData
    );

  }

  getAllDisbursements(): Observable<any> {

    return this.http.get(
      this.disbursementsUrl
    );

  }

  getDisbursementById(
    id: number
  ): Observable<any> {

    return this.http.get(
      `${this.disbursementsUrl}/${id}`
    );

  }

  getDisbursementByClaim(
    claimId: number
  ): Observable<any> {

    return this.http.get(
      `${this.disbursementsUrl}/claim/${claimId}`
    );

  }

  processDisbursement(
    id: number
  ): Observable<any> {

    return this.http.patch(
      `${this.disbursementsUrl}/${id}/process`,
      {}
    );

  }

  failDisbursement(
    id: number
  ): Observable<any> {

    return this.http.patch(
      `${this.disbursementsUrl}/${id}/fail`,
      {}
    );

  }

  retryDisbursement(
    id: number
  ): Observable<any> {

    return this.http.patch(
      `${this.disbursementsUrl}/${id}/retry`,
      {}
    );

  }

  getSettlementSummary(): Observable<any> {

    return this.http.get(
      `${this.disbursementsUrl}/summary`
    );

  }

  deleteDisbursement(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.disbursementsUrl}/${id}`
    );

  }

}