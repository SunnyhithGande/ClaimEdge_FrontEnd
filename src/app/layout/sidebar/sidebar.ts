import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements OnInit {

  claimsOpen = true;
  paymentsOpen = true;

  constructor(
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {}

  get activeRole(): string {
    return this.authService.getRole();
  }

  toggleClaims(): void {
    this.claimsOpen = !this.claimsOpen;
  }

  togglePayments(): void {
    this.paymentsOpen = !this.paymentsOpen;
  }

  navigate(event: Event, path: string): void {
    event.preventDefault();
    this.router.navigateByUrl(path);
  }

  isActiveRoute(route: string): boolean {
    return this.router.url === route || (route !== '/' && this.router.url.startsWith(route));
  }

  hasRole(...allowedRoles: string[]): boolean {
    return this.authService.hasRole(...allowedRoles);
  }

  generateComplianceReport(): void {
    window.print();
  }
}