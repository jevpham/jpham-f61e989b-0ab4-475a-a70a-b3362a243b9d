import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../store/auth/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
              Organize your work,<br>
              <span class="hero-accent">amplify your focus.</span>
            </h1>
            <p class="hero-desc">
              A beautifully crafted task management experience designed for teams who value simplicity and efficiency.
            </p>
          </div>

          <!-- Features -->
          <div class="features">
            <div class="feature">
              <span class="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </span>
              <span class="feature-text">Kanban boards</span>
            </div>
            <div class="feature">
              <span class="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </span>
              <span class="feature-text">Team collaboration</span>
            </div>
            <div class="feature">
              <span class="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4"/>
                </svg>
              </span>
              <span class="feature-text">Real-time sync</span>
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
            <span class="form-eyebrow">Welcome back</span>
            <h2 class="form-title">Sign in to your account</h2>
            <p class="form-desc">Enter your credentials to continue</p>
          </div>

          <!-- Error Message -->
          @if (authStore.error()) {
            <div class="error-banner" role="alert" aria-live="assertive">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4m0 4h.01"/>
              </svg>
              <span>{{ authStore.error() }}</span>
            </div>
          }

          <!-- Form -->
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-group">
              <label for="email" class="form-label">Email address</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                class="form-input"
                [class.input-error]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                [attr.aria-invalid]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                [attr.aria-describedby]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched ? 'email-error' : null"
                autocomplete="email"
                placeholder="you@example.com"
              />
              @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                <span id="email-error" class="field-error" aria-live="polite">
                  @if (loginForm.get('email')?.hasError('required')) {
                    Email is required
                  } @else if (loginForm.get('email')?.hasError('email')) {
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
                [class.input-error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                [attr.aria-invalid]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                [attr.aria-describedby]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched ? 'password-error' : null"
                autocomplete="current-password"
                placeholder="Enter your password"
              />
              @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                <span id="password-error" class="field-error" aria-live="polite">
                  @if (loginForm.get('password')?.hasError('required')) {
                    Password is required
                  } @else if (loginForm.get('password')?.hasError('minlength')) {
                    Password must be at least 8 characters
                  }
                </span>
              }
            </div>

            <button
              type="submit"
              [disabled]="loginForm.invalid || authStore.isLoading()"
              class="submit-btn"
            >
              @if (authStore.isLoading()) {
                <svg class="spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle class="spinner-track" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
                  <path class="spinner-head" d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                </svg>
                <span>Signing in...</span>
              } @else {
                <span>Sign in</span>
                <span class="btn-arrow">→</span>
              }
            </button>
          </form>

          <!-- Footer -->
          <div class="form-footer">
            <span>Don't have an account?</span>
            <a routerLink="/register" class="register-link">Create one now</a>
          </div>
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
      width: 50%;
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
      max-width: 480px;
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
      font-size: clamp(2rem, 3vw, 2.75rem);
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
      gap: 1rem;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 0.75rem;
    }

    .feature-icon {
      width: 20px;
      height: 20px;
      color: #0d9488;
    }

    .feature-icon svg {
      width: 100%;
      height: 100%;
    }

    .feature-text {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.875rem;
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
    }

    .form-container {
      width: 100%;
      max-width: 400px;
    }

    /* Mobile Logo */
    .mobile-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-bottom: 3rem;
    }

    .mobile-logo .logo-mark {
      width: 36px;
      height: 36px;
    }

    .mobile-logo .logo-text {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.25rem;
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
      margin-bottom: 2rem;
    }

    .form-eyebrow {
      display: block;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.75rem;
      font-weight: 600;
      color: #0d9488;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: 0.5rem;
    }

    .form-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.75rem;
      font-weight: 500;
      color: #18181b;
      letter-spacing: -0.02em;
      margin: 0 0 0.5rem;
    }

    .form-desc {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.9375rem;
      color: #71717a;
      margin: 0;
    }

    /* Error Banner */
    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .error-banner svg {
      width: 20px;
      height: 20px;
      color: #dc2626;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .error-banner span {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.875rem;
      color: #b91c1c;
    }

    /* Form */
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-label {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      color: #3f3f46;
    }

    .form-input {
      width: 100%;
      padding: 0.875rem 1rem;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.9375rem;
      color: #18181b;
      background: #fff;
      border: 1.5px solid #e4e4e7;
      border-radius: 0.625rem;
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

    .form-input.input-error:focus {
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
    }

    .field-error {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.8125rem;
      color: #dc2626;
    }

    /* Submit Button */
    .submit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.875rem 1.5rem;
      margin-top: 0.5rem;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
      border: none;
      border-radius: 0.625rem;
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
      font-size: 1.125rem;
      transition: transform 0.2s ease;
    }

    .submit-btn:hover:not(:disabled) .btn-arrow {
      transform: translateX(4px);
    }

    /* Spinner */
    .spinner {
      width: 18px;
      height: 18px;
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

    /* Footer */
    .form-footer {
      margin-top: 2rem;
      text-align: center;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.875rem;
      color: #71717a;
    }

    .register-link {
      color: #0d9488;
      text-decoration: none;
      font-weight: 500;
      margin-left: 0.25rem;
      transition: color 0.2s ease;
    }

    .register-link:hover {
      color: #0f766e;
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
export class LoginComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);

  protected loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit() {
    this.authStore.clearError();
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authStore.login({ email: email!, password: password! });
    }
  }
}
