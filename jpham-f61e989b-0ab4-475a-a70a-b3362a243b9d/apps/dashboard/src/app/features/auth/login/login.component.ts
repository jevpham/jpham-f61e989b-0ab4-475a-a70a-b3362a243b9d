import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../store/auth/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="h-screen flex gradient-mesh-light dark:gradient-mesh-dark grain-overlay">
      <!-- Left side - Branding -->
      <div class="hidden lg:flex lg:w-1/2 h-full relative overflow-hidden">
        <!-- Decorative background -->
        <div class="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900"></div>
        <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23f59e0b%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50"></div>

        <!-- Content -->
        <div class="relative z-10 h-full flex flex-col justify-center px-12 xl:px-20">
          <div class="animate-fade-in-up">
            <!-- Logo -->
            <div class="flex items-center gap-3 mb-12">
              <div class="w-12 h-12 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <svg class="w-7 h-7 text-white" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span class="font-display text-2xl font-semibold text-white">TaskFlow</span>
            </div>

            <h1 class="font-display text-4xl xl:text-5xl font-semibold text-white leading-tight mb-6">
              Organize your work,<br>
              <span class="text-amber-400">amplify your focus.</span>
            </h1>

            <p class="text-lg text-slate-400 max-w-md mb-10">
              A beautiful, intuitive task management experience designed for teams who value simplicity and efficiency.
            </p>

            <!-- Features list -->
            <div class="space-y-4">
              <div class="flex items-center gap-3 text-slate-300">
                <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <svg class="w-4 h-4 text-amber-400" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Drag-and-drop Kanban boards</span>
              </div>
              <div class="flex items-center gap-3 text-slate-300">
                <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <svg class="w-4 h-4 text-amber-400" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Team collaboration & audit logs</span>
              </div>
              <div class="flex items-center gap-3 text-slate-300">
                <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <svg class="w-4 h-4 text-amber-400" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Beautiful dark mode support</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Decorative shapes -->
        <div class="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-amber-500/50 to-transparent"></div>
      </div>

      <!-- Right side - Login form -->
      <div class="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div class="w-full max-w-md">
          <!-- Mobile logo -->
          <div class="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div class="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg class="w-6 h-6 text-white" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <span class="font-display text-xl font-semibold text-slate-900 dark:text-white">TaskFlow</span>
          </div>

          <div class="animate-fade-in-up">
            <div class="text-center mb-8">
              <h2 class="font-display text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                Welcome back
              </h2>
              <p class="text-slate-500 dark:text-slate-400">
                Sign in to continue to your dashboard
              </p>
            </div>

            @if (authStore.error()) {
              <div class="mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 p-4 flex items-start gap-3 animate-fade-in-up">
                <svg class="w-5 h-5 text-red-500 shrink-0 mt-0.5" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p class="text-sm text-red-700 dark:text-red-300">{{ authStore.error() }}</p>
              </div>
            }

            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-5">
              <div>
                <label for="email" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  required
                  class="input-field"
                  [class.input-error]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                  [attr.aria-invalid]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                  [attr.aria-describedby]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched ? 'email-error' : null"
                  placeholder="you@example.com"
                />
                @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                  <p id="email-error" class="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <svg class="w-4 h-4 shrink-0" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    @if (loginForm.get('email')?.hasError('required')) {
                      <span>Email is required</span>
                    } @else if (loginForm.get('email')?.hasError('email')) {
                      <span>Please enter a valid email address</span>
                    }
                  </p>
                }
              </div>

              <div>
                <label for="password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  formControlName="password"
                  required
                  class="input-field"
                  [class.input-error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                  [attr.aria-invalid]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                  [attr.aria-describedby]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched ? 'password-error' : null"
                  placeholder="Enter your password"
                />
                @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                  <p id="password-error" class="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <svg class="w-4 h-4 shrink-0" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    @if (loginForm.get('password')?.hasError('required')) {
                      <span>Password is required</span>
                    } @else if (loginForm.get('password')?.hasError('minlength')) {
                      <span>Password must be at least 8 characters</span>
                    }
                  </p>
                }
              </div>

              <button
                type="submit"
                [disabled]="loginForm.invalid || authStore.isLoading()"
                class="btn-primary w-full justify-center py-3 text-base"
              >
                @if (authStore.isLoading()) {
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4" width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                } @else {
                  <span>Sign in</span>
                }
              </button>
            </form>

            <p class="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Don't have an account?
              <a routerLink="/register" class="font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300 transition-colors">
                Create one now
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
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
