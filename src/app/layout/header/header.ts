import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';
 
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit {
 
  public authService = inject(AuthService);
  public layoutService = inject(LayoutService);
  private router = inject(Router);
 
  user: User | null = null;
  unreadNotificationsCount: number = 3;
  showProfileMenu = false;
 
  ngOnInit(): void {
    this.user = this.authService.getUser();
  }
 
  get userRole(): string {
    return this.authService.getRole();
  }
 
  get userName(): string {
    const u = this.authService.getUser();
    if (!u) {
      return 'User';
    }
    return u.name || 'User';
  }
  toggleSidebar(): void {
    this.layoutService.toggleSidebar();
  }
 
  toggleProfileMenu(): void {
    this.showProfileMenu = !this.showProfileMenu;
  }
 
  closeProfileMenu(): void {
    this.showProfileMenu = false;
  }
 
  signOut(): void {
    this.showProfileMenu = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}