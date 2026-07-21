import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { User, AuthResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // Signal for reactive user state
  private _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  // Computed state
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly userRole = computed(() => this._currentUser()?.role || null);

  constructor() {
    this.loadUserFromStorage();
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.apiService.post<AuthResponse>('/auth/login', credentials).pipe(
      tap((response) => {
        this.setSession(response);
      }),
    );
  }

  logout(): void {
    // Optionally call backend logout endpoint to blacklist token
    this.apiService
      .post('/auth/logout')
      .pipe(
        catchError(() => {
          // Fallback in case backend logout fails
          this.clearSessionAndRedirect();
          return throwError(() => new Error('Logout backend failed'));
        }),
      )
      .subscribe({
        next: () => this.clearSessionAndRedirect(),
        error: () => this.clearSessionAndRedirect(),
      });
  }

  refreshToken(): Observable<{ access_token: string; refresh_token: string }> {
    const refreshToken = localStorage.getItem('refresh_token');
    return this.apiService
      .post<{
        access_token: string;
        refresh_token: string;
      }>('/auth/refresh', { refresh_token: refreshToken })
      .pipe(
        tap((response) => {
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('refresh_token', response.refresh_token);
        }),
        catchError((err) => {
          this.clearSessionAndRedirect();
          return throwError(() => err);
        }),
      );
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  hasRole(allowedRoles: string[]): boolean {
    const role = this.userRole();
    return role ? allowedRoles.includes(role) : false;
  }

  private setSession(authResult: AuthResponse): void {
    const user = this.userFromAccessToken(authResult.access_token);
    localStorage.setItem('access_token', authResult.access_token);
    localStorage.setItem('refresh_token', authResult.refresh_token);
    localStorage.setItem('user', JSON.stringify(user));
    this._currentUser.set(user);
  }

  private userFromAccessToken(token: string): User {
    const payload = JSON.parse(this.decodePayload(token)) as {
      sub: string;
      email?: string;
      name?: string;
      roles?: string[];
      role?: string;
      is_active?: boolean;
    };
    return {
      id: payload.sub,
      name: payload.name ?? payload.email ?? 'Usuario EASYDOC',
      email: payload.email ?? '',
      role: payload.roles?.[0] ?? payload.role ?? 'user',
      status: payload.is_active === false ? 'inactive' : 'active',
    };
  }

  private decodePayload(token: string): string {
    const segment = token.split('.')[1];
    if (!segment) throw new Error('Token JWT invalido');
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    return decodeURIComponent(
      atob(normalized + padding)
        .split('')
        .map((character) => `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
  }

  private clearSessionAndRedirect(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this._currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem('user');
    const token = this.getAccessToken();
    if (userStr && token) {
      try {
        const user = JSON.parse(userStr) as User;
        this._currentUser.set(user);
      } catch (e) {
        this.clearSessionAndRedirect();
      }
    }
  }
}
