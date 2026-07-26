import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterOutlet,
  NavigationEnd
} from '@angular/router';

import { filter } from 'rxjs';

import { Header } from './layout/header/header';
import { Sidebar } from './layout/sidebar/sidebar';
import { Footer } from './layout/footer/footer';
import { LayoutService } from './core/services/layout.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    Header,
    Sidebar,
    Footer
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  public layoutService = inject(LayoutService);
  showLayout = true;

  constructor(private router: Router) {

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe(() => {

        this.showLayout =
  !this.router.url.startsWith('/login') &&
  !this.router.url.startsWith('/register');

      });

  }

}