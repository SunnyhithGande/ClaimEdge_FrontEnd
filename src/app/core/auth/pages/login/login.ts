import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  loginForm: FormGroup;
  errorMessage: string = '';
  loading: boolean = false;

  rolesList = [
    { value: 'POLICYHOLDER', label: 'Policyholder' },
    { value: 'POLICY_ADMIN', label: 'Policy Administrator' },
    { value: 'UNDERWRITER', label: 'Underwriter' },
    { value: 'ADJUSTER', label: 'Claims Adjuster' },
    { value: 'OPERATIONS', label: 'Operations Analyst' },
    { value: 'OPERATIONS_ANALYST', label: 'Operations Analyst (Extended)' },
    { value: 'COMPLIANCE', label: 'Compliance Analyst' },
    { value: 'ADMIN', label: 'Insurance Admin' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['POLICYHOLDER', Validators.required]
    });
  }

  signIn(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const credentials = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    this.authService.login(credentials).subscribe({
      next: () => {
        this.loading = false;
        // Use actual user role from JWT token / user record, ignoring UI dropdown reference
        const actualRole = this.authService.getRole();
        this.navigateByRole(actualRole);
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Backend Login Error:', err);
        this.errorMessage = 'Authentication Failed: User account not found or invalid password. If you are a new user, please register first.';
      }
    });
  }

  navigateByRole(role: string): void {
    const targetRole = (role || '').toUpperCase();
    switch (targetRole) {
      case 'POLICYHOLDER':
        this.router.navigate(['/policies']);
        break;
      case 'POLICY_ADMIN':
        this.router.navigate(['/policies']);
        break;
      case 'UNDERWRITER':
        this.router.navigate(['/underwriting']);
        break;
      case 'ADJUSTER':
        this.router.navigate(['/claims/assessments']);
        break;
      case 'FRAUD_ANALYST':
      case 'COMPLIANCE':
        this.router.navigate(['/compliance']);
        break;
      case 'OPERATIONS':
      case 'OPERATIONS_ANALYST':
      case 'OPS':
        this.router.navigate(['/analytics']);
        break;
      case 'ADMIN':
      default:
        this.router.navigate(['/dashboard']);
        break;
    }
  }
}
