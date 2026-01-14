import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected isLoading = false;
  protected error: string | null = null;
  protected success = false;

  protected registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)]],
    organizationName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
    organizationSlug: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50), Validators.pattern(/^[a-z0-9-]+$/)]],
  });

  // Password validation getters for real-time feedback
  protected get passwordValue(): string {
    return this.registerForm.get('password')?.value || '';
  }

  protected get hasMinLength(): boolean {
    return this.passwordValue.length >= 8;
  }

  protected get hasUppercase(): boolean {
    return /[A-Z]/.test(this.passwordValue);
  }

  protected get hasLowercase(): boolean {
    return /[a-z]/.test(this.passwordValue);
  }

  protected get hasNumber(): boolean {
    return /\d/.test(this.passwordValue);
  }

  protected get hasSpecialChar(): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.passwordValue);
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.error = null;

      const { email, password, organizationName, organizationSlug } = this.registerForm.value;

      this.authService.register({
        email: email!,
        password: password!,
        organizationName: organizationName!,
        organizationSlug: organizationSlug!,
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.success = true;
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          },
          error: (err) => {
            this.isLoading = false;
            this.error = err.error?.message || 'Registration failed';
          },
        });
    }
  }
}
