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
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or
            <a routerLink="/login" class="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
              sign in to existing account
            </a>
          </p>
        </div>

        @if (error) {
          <div class="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
            <p class="text-sm text-red-700 dark:text-red-200">{{ error }}</p>
          </div>
        }

        @if (success) {
          <div class="rounded-md bg-green-50 dark:bg-green-900/50 p-4">
            <p class="text-sm text-green-700 dark:text-green-200">Registration successful! Redirecting to login...</p>
          </div>
        }

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="email" class="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label for="password" class="sr-only">Password</label>
              <input
                id="password"
                type="password"
                formControlName="password"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password (min 8 characters)"
              />
            </div>
            <div>
              <label for="organizationName" class="sr-only">Organization Name</label>
              <input
                id="organizationName"
                type="text"
                formControlName="organizationName"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Organization Name"
              />
            </div>
            <div>
              <label for="organizationSlug" class="sr-only">Organization Slug</label>
              <input
                id="organizationSlug"
                type="text"
                formControlName="organizationSlug"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Organization Slug (lowercase, alphanumeric, hyphens)"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              [disabled]="registerForm.invalid || isLoading"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (isLoading) {
                <span>Creating account...</span>
              } @else {
                <span>Create account</span>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
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
