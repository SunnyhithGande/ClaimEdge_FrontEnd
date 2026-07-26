import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClaimsService {

  private claimsUrl =
    `${environment.apiUrl}/claims`;

  private assessmentsUrl =
    `${environment.apiUrl}/assessments`;

  constructor(
    private http: HttpClient
  ) {}

  // =====================================
  // CLAIM APIs
  // =====================================

  submitClaim(
    claimData: any
  ): Observable<any> {

    return this.http.post(
      `${this.claimsUrl}/submit`,
      claimData
    );

  }

  getAllClaims(): Observable<any> {

    return this.http.get(
      this.claimsUrl
    );

  }

  getClaimById(
    id: number
  ): Observable<any> {

    return this.http.get(
      `${this.claimsUrl}/${id}`
    );

  }

  updateClaim(
    id: number,
    claimData: any
  ): Observable<any> {

    return this.http.put(
      `${this.claimsUrl}/${id}`,
      claimData
    );

  }

  deleteClaim(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.claimsUrl}/${id}`
    );

  }

  assignAdjuster(
    claimId: number,
    adjusterId: number
  ): Observable<any> {

    return this.http.patch(
      `${this.claimsUrl}/${claimId}/assign?adjusterId=${adjusterId}`,
      {}
    );

  }

  approveClaim(
    claimId: number
  ): Observable<any> {

    return this.http.patch(
      `${this.claimsUrl}/${claimId}/approve`,
      {}
    );

  }

  rejectClaim(
    claimId: number,
    reason: string
  ): Observable<any> {

    return this.http.patch(
      `${this.claimsUrl}/${claimId}/reject?reason=${reason}`,
      {}
    );

  }

  settleClaim(
    claimId: number
  ): Observable<any> {

    return this.http.patch(
      `${this.claimsUrl}/${claimId}/settle`,
      {}
    );

  }

  reopenClaim(
    claimId: number
  ): Observable<any> {

    return this.http.patch(
      `${this.claimsUrl}/${claimId}/reopen`,
      {}
    );

  }

  getSubmittedClaims(): Observable<any> {

    return this.http.get(
      `${this.claimsUrl}/status/submitted`
    );

  }

  getUnderReviewClaims(): Observable<any> {

    return this.http.get(
      `${this.claimsUrl}/status/under-review`
    );

  }

  getApprovedClaims(): Observable<any> {

    return this.http.get(
      `${this.claimsUrl}/status/approved`
    );

  }

  getRejectedClaims(): Observable<any> {

    return this.http.get(
      `${this.claimsUrl}/status/rejected`
    );

  }

  getSettledClaims(): Observable<any> {

    return this.http.get(
      `${this.claimsUrl}/status/settled`
    );

  }

  // =====================================
  // ASSESSMENT APIs
  // =====================================

  createAssessment(
    assessmentData: any
  ): Observable<any> {

    return this.http.post(
      this.assessmentsUrl,
      assessmentData
    );

  }

  getAllAssessments(): Observable<any> {

    return this.http.get(
      this.assessmentsUrl
    );

  }

  getAssessmentById(
    id: number
  ): Observable<any> {

    return this.http.get(
      `${this.assessmentsUrl}/${id}`
    );

  }

  updateAssessment(
    id: number,
    assessmentData: any
  ): Observable<any> {

    return this.http.put(
      `${this.assessmentsUrl}/${id}`,
      assessmentData
    );

  }

  deleteAssessment(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.assessmentsUrl}/${id}`
    );

  }

  validateClaim(
    claimId: number
  ): Observable<any> {

    return this.http.post(
      `${this.assessmentsUrl}/claims/${claimId}/validate`,
      {}
    );

  }

  fraudCheck(
    claimId: number
  ): Observable<any> {

    return this.http.post(
      `${this.assessmentsUrl}/claims/${claimId}/fraud-check`,
      {}
    );

  }

 getClaimTimeline(
  claimId: number
): Observable<any> {

  return this.http.get(
    `${this.assessmentsUrl}/claims/${claimId}/timeline`
  );

}

}