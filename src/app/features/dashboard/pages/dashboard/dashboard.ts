import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {

  public authService = inject(AuthService);
  private router = inject(Router);

  currentUser: User | null = null;

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
  }

  get userRole(): string {
    return this.authService.getRole();
  }

  get userName(): string {
    return this.currentUser?.name || 'User';
  }

  hasRole(...allowedRoles: string[]): boolean {
    return this.authService.hasRole(...allowedRoles);
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
