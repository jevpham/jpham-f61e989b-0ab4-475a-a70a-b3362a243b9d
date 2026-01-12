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
  template: `
    <div class="auth-container">
      <!-- Decorative Background -->
      <div class="auth-background">
        <div class="bg-pattern"></div>
        <div class="bg-gradient"></div>
      </div>

      <!-- Left Panel - Branding -->
      <div class="brand-panel">
        <div class="brand-content">
          <!-- Logo -->
          <div class="logo">
            <div class="logo-mark">
              <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" stroke-width="2.5"/>
                <path d="M10 16L14 20L22 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="logo-text">TaskFlow</span>
          </div>

          <!-- Hero Text -->
          <div class="hero-content">
            <h1 class="hero-title">
              Join TaskFlow,<br>
              <span class="hero-accent">start organizing today.</span>
            </h1>
            <p class="hero-desc">
              Create your organization and start managing tasks with your team in seconds.
            </p>
          </div>

          <!-- Features -->
          <div class="features">
            <div class="feature">
              <span class="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </span>
              <span class="feature-text">Enterprise-grade security</span>
            </div>
            <div class="feature">
              <span class="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </span>
              <span class="feature-text">Unlimited team members</span>
            </div>
            <div class="feature">
              <span class="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
              </span>
              <span class="feature-text">Export & backup anytime</span>
            </div>
          </div>
        </div>

        <!-- Decorative line -->
        <div class="brand-line"></div>
      </div>

      <!-- Right Panel - Form -->
      <div class="form-panel">
        <div class="form-container">
          <!-- Mobile Logo -->
          <div class="mobile-logo">
            <div class="logo-mark">
              <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" stroke-width="2.5"/>
                <path d="M10 16L14 20L22 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="logo-text">TaskFlow</span>
          </div>

          <!-- Form Header -->
          <div class="form-header">
            <span class="form-eyebrow">Get started</span>
            <h2 class="form-title">Create your account</h2>
            <p class="form-desc">Already have an account? <a routerLink="/login" class="login-link">Sign in</a></p>
          </div>

          <!-- Error Message -->
          @if (error) {
            <div class="error-banner" role="alert" aria-live="assertive">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4m0 4h.01"/>
              </svg>
              <span>{{ error }}</span>
            </div>
          }

          <!-- Success Message -->
          @if (success) {
            <div class="success-banner" role="status" aria-live="polite">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <path d="M22 4L12 14.01l-3-3"/>
              </svg>
              <span>Registration successful! Redirecting...</span>
            </div>
          }

          <!-- Form -->
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-group">
              <label for="email" class="form-label">Email address</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                class="form-input"
                [class.input-error]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
                [attr.aria-invalid]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
                [attr.aria-describedby]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched ? 'email-error' : null"
                autocomplete="email"
                placeholder="you@example.com"
              />
              @if (registerForm.get('email')?.invalid && registerForm.get('email')?.touched) {
                <span id="email-error" class="field-error" aria-live="polite">
                  @if (registerForm.get('email')?.hasError('required')) {
                    Email is required
                  } @else if (registerForm.get('email')?.hasError('email')) {
                    Please enter a valid email
                  }
                </span>
              }
            </div>

            <div class="form-group">
              <label for="password" class="form-label">Password</label>
              <input
                id="password"
                type="password"
                formControlName="password"
                class="form-input"
                [class.input-error]="registerForm.get('password')?.touched && registerForm.get('password')?.invalid"
                [attr.aria-invalid]="registerForm.get('password')?.touched && registerForm.get('password')?.invalid"
                aria-describedby="password-requirements"
                autocomplete="new-password"
                placeholder="Create a strong password"
              />
              <!-- Password requirements -->
              <div id="password-requirements" class="password-requirements" aria-live="polite" role="status">
                <span class="req-label">Password must contain:</span>
                <div class="req-grid">
                  <div class="req-item" [class.req-met]="hasMinLength" [attr.aria-label]="hasMinLength ? '8+ characters requirement met' : '8+ characters requirement not met'">
                    <span class="req-icon" aria-hidden="true">{{ hasMinLength ? '✓' : '○' }}</span>
                    <span>8+ characters</span>
                  </div>
                  <div class="req-item" [class.req-met]="hasUppercase" [attr.aria-label]="hasUppercase ? 'Uppercase letter requirement met' : 'Uppercase letter requirement not met'">
                    <span class="req-icon" aria-hidden="true">{{ hasUppercase ? '✓' : '○' }}</span>
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div class="req-item" [class.req-met]="hasLowercase" [attr.aria-label]="hasLowercase ? 'Lowercase letter requirement met' : 'Lowercase letter requirement not met'">
                    <span class="req-icon" aria-hidden="true">{{ hasLowercase ? '✓' : '○' }}</span>
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div class="req-item" [class.req-met]="hasNumber" [attr.aria-label]="hasNumber ? 'Number requirement met' : 'Number requirement not met'">
                    <span class="req-icon" aria-hidden="true">{{ hasNumber ? '✓' : '○' }}</span>
                    <span>Number (0-9)</span>
                  </div>
                  <div class="req-item req-full" [class.req-met]="hasSpecialChar" [attr.aria-label]="hasSpecialChar ? 'Special character requirement met' : 'Special character requirement not met'">
                    <span class="req-icon" aria-hidden="true">{{ hasSpecialChar ? '✓' : '○' }}</span>
                    <span>Special character (!&#64;#$%^&*...)</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="organizationName" class="form-label">Organization Name</label>
                <input
                  id="organizationName"
                  type="text"
                  formControlName="organizationName"
                  class="form-input"
                  [class.input-error]="registerForm.get('organizationName')?.invalid && registerForm.get('organizationName')?.touched"
                  [attr.aria-invalid]="registerForm.get('organizationName')?.invalid && registerForm.get('organizationName')?.touched"
                  autocomplete="organization"
                  placeholder="Acme Inc."
                />
              </div>
              <div class="form-group">
                <label for="organizationSlug" class="form-label">Slug</label>
                <input
                  id="organizationSlug"
                  type="text"
                  formControlName="organizationSlug"
                  class="form-input"
                  [class.input-error]="registerForm.get('organizationSlug')?.invalid && registerForm.get('organizationSlug')?.touched"
                  [attr.aria-invalid]="registerForm.get('organizationSlug')?.invalid && registerForm.get('organizationSlug')?.touched"
                  aria-describedby="slug-hint"
                  placeholder="acme-inc"
                />
                <span id="slug-hint" class="field-hint">Lowercase, numbers, hyphens</span>
              </div>
            </div>

            <button
              type="submit"
              [disabled]="registerForm.invalid || isLoading"
              class="submit-btn"
            >
              @if (isLoading) {
                <svg class="spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle class="spinner-track" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
                  <path class="spinner-head" d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                </svg>
                <span>Creating account...</span>
              } @else {
                <span>Create account</span>
                <span class="btn-arrow">→</span>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      position: relative;
    }

    /* Background */
    .auth-background {
      position: fixed;
      inset: 0;
      z-index: 0;
    }

    .bg-pattern {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px);
      background-size: 40px 40px;
    }

    .bg-gradient {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 80% 60% at 0% 50%, rgba(13, 148, 136, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse 60% 80% at 100% 50%, rgba(251, 146, 60, 0.05) 0%, transparent 50%);
    }

    /* Brand Panel */
    .brand-panel {
      display: none;
      width: 45%;
      background: #0c0c0c;
      position: relative;
      overflow: hidden;
    }

    @media (min-width: 1024px) {
      .brand-panel {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    .brand-content {
      position: relative;
      z-index: 1;
      padding: 4rem;
      max-width: 420px;
    }

    /* Logo */
    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 4rem;
    }

    .logo-mark {
      width: 40px;
      height: 40px;
      color: #0d9488;
    }

    .logo-mark svg {
      width: 100%;
      height: 100%;
    }

    .logo-text {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.5rem;
      font-weight: 600;
      color: #fafafa;
      letter-spacing: -0.02em;
    }

    /* Hero */
    .hero-content {
      margin-bottom: 3rem;
    }

    .hero-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(1.75rem, 2.5vw, 2.5rem);
      font-weight: 500;
      color: #fafafa;
      letter-spacing: -0.02em;
      line-height: 1.2;
      margin: 0 0 1.5rem;
    }

    .hero-accent {
      color: #0d9488;
    }

    .hero-desc {
      font-family: 'DM Sans', sans-serif;
      font-size: 1rem;
      color: #71717a;
      line-height: 1.6;
      margin: 0;
    }

    /* Features */
    .features {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.875rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 0.625rem;
    }

    .feature-icon {
      width: 18px;
      height: 18px;
      color: #0d9488;
    }

    .feature-icon svg {
      width: 100%;
      height: 100%;
    }

    .feature-text {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.8125rem;
      color: #a1a1aa;
    }

    /* Brand Line */
    .brand-line {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 1px;
      background: linear-gradient(180deg, transparent 0%, rgba(13, 148, 136, 0.3) 50%, transparent 100%);
    }

    /* Form Panel */
    .form-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: #fafaf9;
      position: relative;
      z-index: 1;
      overflow-y: auto;
    }

    .form-container {
      width: 100%;
      max-width: 440px;
    }

    /* Mobile Logo */
    .mobile-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }

    .mobile-logo .logo-mark {
      width: 32px;
      height: 32px;
    }

    .mobile-logo .logo-text {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.125rem;
      font-weight: 600;
      color: #18181b;
    }

    @media (min-width: 1024px) {
      .mobile-logo {
        display: none;
      }
    }

    /* Form Header */
    .form-header {
      margin-bottom: 1.5rem;
    }

    .form-eyebrow {
      display: block;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.75rem;
      font-weight: 600;
      color: #0d9488;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: 0.375rem;
    }

    .form-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.5rem;
      font-weight: 500;
      color: #18181b;
      letter-spacing: -0.02em;
      margin: 0 0 0.375rem;
    }

    .form-desc {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.875rem;
      color: #71717a;
      margin: 0;
    }

    .login-link {
      color: #0d9488;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s ease;
    }

    .login-link:hover {
      color: #0f766e;
    }

    /* Banners */
    .error-banner, .success-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-radius: 0.625rem;
      margin-bottom: 1.25rem;
    }

    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .error-banner svg {
      width: 18px;
      height: 18px;
      color: #dc2626;
      flex-shrink: 0;
    }

    .error-banner span {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.8125rem;
      color: #b91c1c;
    }

    .success-banner {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }

    .success-banner svg {
      width: 18px;
      height: 18px;
      color: #16a34a;
      flex-shrink: 0;
    }

    .success-banner span {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.8125rem;
      color: #15803d;
    }

    /* Form */
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 0.75rem;
    }

    @media (max-width: 480px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .form-label {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #3f3f46;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 0.875rem;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.875rem;
      color: #18181b;
      background: #fff;
      border: 1.5px solid #e4e4e7;
      border-radius: 0.5rem;
      transition: all 0.2s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: #0d9488;
      box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
    }

    .form-input::placeholder {
      color: #a1a1aa;
    }

    .form-input.input-error {
      border-color: #dc2626;
    }

    .field-hint {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.6875rem;
      color: #a1a1aa;
    }

    /* Password Requirements */
    .password-requirements {
      margin-top: 0.5rem;
      padding: 0.75rem;
      background: #f4f4f5;
      border-radius: 0.5rem;
    }

    .req-label {
      display: block;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.6875rem;
      font-weight: 600;
      color: #71717a;
      margin-bottom: 0.5rem;
    }

    .req-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.375rem;
    }

    .req-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.6875rem;
      color: #a1a1aa;
    }

    .req-item.req-met {
      color: #059669;
    }

    .req-icon {
      font-size: 0.625rem;
    }

    .req-full {
      grid-column: span 2;
    }

    /* Submit Button */
    .submit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.75rem 1.25rem;
      margin-top: 0.5rem;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
    }

    .submit-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(13, 148, 136, 0.4);
    }

    .submit-btn:disabled {
      background: #d4d4d8;
      color: #a1a1aa;
      box-shadow: none;
      cursor: not-allowed;
      transform: none;
    }

    .btn-arrow {
      font-size: 1rem;
      transition: transform 0.2s ease;
    }

    .submit-btn:hover:not(:disabled) .btn-arrow {
      transform: translateX(4px);
    }

    /* Spinner */
    .spinner {
      width: 16px;
      height: 16px;
      animation: spin 1s linear infinite;
    }

    .spinner-track {
      opacity: 0.2;
    }

    .spinner-head {
      opacity: 1;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Animations */
    .form-container {
      animation: fadeIn 0.5s ease-out;
    }

    .brand-content {
      animation: slideIn 0.6s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `],
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
