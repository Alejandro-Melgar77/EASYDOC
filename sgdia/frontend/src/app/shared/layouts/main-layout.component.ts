import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../components/header.component';
import { SidebarComponent } from '../components/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent],
  template: `
    <div class="layout-wrapper">
      <!-- Sidebar navigation -->
      <app-sidebar></app-sidebar>

      <div class="main-content">
        <!-- Sticky header -->
        <app-header></app-header>

        <!-- Scrollable content -->
        <main class="page-container">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .layout-wrapper {
        display: flex;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
      }

      .main-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
        height: 100vh;
        overflow: hidden;
        background: var(--bg-primary);
      }

      .page-container {
        flex: 1;
        min-width: 0;
        padding: 1.5rem;
        overflow-y: auto;
        position: relative;
      }

      @media (max-width: 1600px) {
        .page-container {
          padding: 1rem;
        }
      }

      @media (max-width: 720px) {
        .page-container {
          padding: 0.65rem;
        }
      }
    `,
  ],
})
export class MainLayoutComponent {}
