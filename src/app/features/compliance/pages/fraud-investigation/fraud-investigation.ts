import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ClaimsService } from '../../../claim/services/claim.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-fraud-investigation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fraud-investigation.html',
  styleUrl: './fraud-investigation.css'
})
export class FraudInvestigationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private claimsService = inject(ClaimsService);
  private location = inject(Location);

  flagId: number | null = null;
  fraudFlag: any = null;
  claim: any = null;
  documents: any[] = [];
  
  loading = true;
  message = '';
  isConfirmed = false;
  isCleared = false;
  isFraudConfirmed = false;
  submitting = false;

  adjusterId: string = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.flagId = Number(idParam);
      this.loadInvestigationData();
    } else {
      this.message = 'Invalid Fraud Flag ID.';
      this.loading = false;
    }
  }

  loadInvestigationData(): void {
    this.http.get<any[]>('http://localhost:8010/api/fraud').subscribe({
      next: (flags) => {
        this.fraudFlag = flags.find(f => f.flagId === this.flagId);
        if (this.fraudFlag) {
          if (this.fraudFlag.status === 'INVESTIGATED' || this.fraudFlag.status === 'CONFIRMED_FRAUD' || this.fraudFlag.status === 'CONFIRMED' || this.fraudFlag.status === 'CLEARED') {
            this.isConfirmed = true;
          }
          if (this.fraudFlag.status === 'CONFIRMED_FRAUD' || this.fraudFlag.status === 'CONFIRMED') {
            this.isFraudConfirmed = true;
          }
          if (this.fraudFlag.status === 'CLEARED') {
            this.isCleared = true;
          }

          this.claimsService.getClaimById(this.fraudFlag.claimId).subscribe({
            next: (c) => {
              this.claim = c;
              this.loadDocuments(c);
              this.loading = false;
            },
            error: (err) => {
              console.error('Failed to load claim', err);
              this.message = 'Failed to load claim details.';
              this.loading = false;
            }
          });
        } else {
          this.message = 'Fraud flag not found.';
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('Failed to load fraud flags', err);
        this.message = 'Failed to load fraud flag.';
        this.loading = false;
      }
    });
  }

  loadDocuments(c: any): void {
    const savedDocs = localStorage.getItem(`docs_claim_${c.claimId}`);
    if (savedDocs) {
      try {
        const parsed = JSON.parse(savedDocs);
        if (parsed && parsed.length > 0) {
          this.documents = parsed;
        }
      } catch (e) {}
    }
    if (this.documents.length === 0) {
      this.documents = [
        { name: `Insurance_Report_Claim#${c.claimId}.pdf`, size: '1.2 MB', date: new Date().toISOString().split('T')[0], type: 'application/pdf' }
      ];
    }
  }

  viewDocument(doc: any): void {
    if (doc.url) {
      const win = window.open('', '_blank');
      if (win) {
        if (doc.type && doc.type.startsWith('image/')) {
          win.document.write(`<title>${doc.name}</title><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#333;height:100vh;"><img src="${doc.url}" style="max-width:100%;max-height:100vh;"></body>`);
        } else {
          win.document.write(`<title>${doc.name}</title><body style="margin:0;"><iframe src="${doc.url}" width="100%" height="100%" style="border:none;"></iframe></body>`);
        }
      }
    } else {
      alert(`📄 Viewing Document: ${doc.name}\nSize: ${doc.size}\nUpload Date: ${doc.date || 'N/A'}\nType: ${doc.type || 'N/A'}\nStatus: Verified Customer Upload`);
    }
  }

  confirmInvestigation(): void {
    if (this.submitting) return;
    this.submitting = true;
    
    this.http.put<any>(`http://localhost:8010/api/fraud/${this.flagId}/investigate`, {
      reviewedBy: 'System Analyst', 
      notes: 'Investigation confirmed manually.'
    }).subscribe({
      next: (updatedFlag) => {
        this.fraudFlag = updatedFlag;
        this.isConfirmed = true;
        this.message = 'Successfully investigated.';
        this.submitting = false;
      },
      error: (err) => {
        console.error('Investigation failed', err);
        this.message = 'Failed to confirm investigation.';
        this.submitting = false;
      }
    });
  }

  clearFlag(): void {
    if (this.submitting) return;
    this.submitting = true;

    this.http.put<any>(`http://localhost:8010/api/fraud/${this.flagId}/clear`, {
      clearedBy: 'System Analyst'
    }).subscribe({
      next: (updatedFlag) => {
        this.fraudFlag = updatedFlag;
        this.isCleared = true;
        this.message = 'Fraud flag cleared successfully. Please assign an adjuster.';
        this.submitting = false;
      },
      error: (err) => {
        console.error('Clear failed', err);
        this.message = 'Failed to clear fraud flag.';
        this.submitting = false;
      }
    });
  }

  confirmFraud(): void {
    if (this.submitting) return;
    this.submitting = true;

    this.http.put<any>(`http://localhost:8010/api/fraud/${this.flagId}/confirm`, {
      confirmedBy: 'System Analyst'
    }).subscribe({
      next: (updatedFlag) => {
        this.fraudFlag = updatedFlag;
        this.isFraudConfirmed = true;
        this.message = 'Fraud confirmed successfully.';
        this.submitting = false;
      },
      error: (err) => {
        console.error('Confirm failed', err);
        this.message = 'Failed to confirm fraud flag.';
        this.submitting = false;
      }
    });
  }

  assignAdjuster(): void {
    if (!this.adjusterId) {
      alert('Please enter an Adjuster ID.');
      return;
    }
    this.submitting = true;
    
    this.claimsService.assignAdjuster(this.claim.claimId, Number(this.adjusterId)).subscribe({
      next: (updatedClaim: any) => {
        this.claim.status = updatedClaim.status;
        this.message = 'Adjuster assigned successfully.';
        this.submitting = false;
        setTimeout(() => {
          this.router.navigate(['/compliance/dashboard']);
        }, 1500);
      },
      error: (err) => {
        console.error('Assign adjuster failed', err);
        this.message = 'Failed to assign adjuster.';
        this.submitting = false;
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}
