import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IUser, LoginDto, RegisterDto } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

// Response from login/refresh - no refreshToken (it's in httpOnly cookie)
export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: IUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  login(credentials: LoginDto): Observable<AuthResponse> {
    // withCredentials: true sends/receives cookies (for httpOnly refresh token)
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials, {
      withCredentials: true,
    });
  }

  register(data: RegisterDto): Observable<IUser> {
    return this.http.post<IUser>(`${this.apiUrl}/register`, data, {
      withCredentials: true,
    });
  }

  logout(): Observable<{ message: string }> {
    // withCredentials: true to send the cookie so backend can clear it
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, {}, {
      withCredentials: true,
    });
  }

  refreshToken(): Observable<AuthResponse> {
    // withCredentials: true to send the httpOnly refresh token cookie
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, {}, {
      withCredentials: true,
    });
  }
}
