import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  isSidebarVisible: boolean = true;

  toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
  }
}
