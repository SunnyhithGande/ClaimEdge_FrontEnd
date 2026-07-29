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

    // Registration duplicate check is now handled exclusively by the backend (409 Conflict)
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
        
        let msg = 'Registration failed. ';
        if (error.status === 0) {
           msg += 'Cannot connect to backend server. Is it running?';
        } else if (error.status === 401) {
           msg += 'Session invalid. Please clear your cache and try again.';
        } else if (error.status === 409) {
           msg += 'This email has already been registered.';
        } else if (error.error && error.error.message) {
           msg += error.error.message;
        } else if (error.error && typeof error.error === 'string') {
           msg += error.error;
        } else {
           msg += 'Server encountered an error.';
        }

        this.errorMessage = '⚠️ ' + msg;
        this.successMessage = '';
        this.registrationCompleted = false;
        this.cdr.detectChanges();
      }
    });
  }
}
