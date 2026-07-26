import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {

  registerForm: FormGroup;
  errorMessage = '';
  successMessage = '';
  loading = false;
  registrationCompleted = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phone: ['', Validators.required]
    });
  }

  register(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const emailVal = (this.registerForm.value.email || '').toLowerCase().trim();

    // 1. Strict Duplicate Email Check against MySQL Database & Local Directory
    if (this.authService.isEmailRegistered(emailVal)) {
      this.errorMessage = '⚠️ This email has already been registered. Please use a different email address or proceed to Login.';
      this.successMessage = '';
      this.loading = false;
      this.registrationCompleted = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.registrationCompleted = false;

    // Every registering user is assigned role POLICYHOLDER
    const payload = {
      ...this.registerForm.value,
      email: emailVal,
      role: 'POLICYHOLDER'
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.loading = false;
        this.errorMessage = '';
        this.successMessage = '✅ Registration Successful! Policyholder account created. You can now proceed to login.';
        this.registrationCompleted = true;
        this.registerForm.reset();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Registration Error:', error);

        // Display duplicate email error message and do NOT save duplicate account
        this.errorMessage = '⚠️ This email has already been registered. Please use a different email address or proceed to Login.';
        this.successMessage = '';
        this.registrationCompleted = false;
        this.cdr.detectChanges();
      }
    });
  }
}
