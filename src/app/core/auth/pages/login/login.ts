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
    { value: 'OPERATIONS_ANALYST', label: 'Operations Analyst' },
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
      password: ['', [Validators.required, Validators.minLength(1)]],
      /*role: ['POLICYHOLDER', Validators.required]*/
    });
  }
 
  signIn(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
 
    this.loading = true;
    this.errorMessage = '';
 
    const selectedRole = this.loginForm.value.role;
    const emailVal = (this.loginForm.value.email || '').toLowerCase().trim();
    const credentials = {
      email: emailVal,
      password: this.loginForm.value.password
    };
 
    this.authService.login(credentials).subscribe({
      next: () => {
        this.authService
          .getCurrentUserFromApi()
          .subscribe({
            next: (user) => {
              this.loading = false;
              this.navigateByRole(
                user.role
              );
            },
            error: () => {
              this.loading = false;
              this.errorMessage =
                'Unable to load user profile';
            }
          });
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        this.errorMessage =
          err?.error?.error ||
          'Invalid credentials';
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
        this.router.navigate(['/compliance/dashboard']);
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