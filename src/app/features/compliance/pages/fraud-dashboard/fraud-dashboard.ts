import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import Chart from 'chart.js/auto';

interface FraudFlag {
  flagId: number;
  claimId: number;
  fraudType: string;
  severity: string;
  status: string;
  description?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-fraud-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './fraud-dashboard.html',
  styleUrl: './fraud-dashboard.css'
})
export class FraudDashboardComponent implements OnInit, AfterViewInit {

  private http = inject(HttpClient);
  private router = inject(Router);
  
  @ViewChild('statusChart') statusChartRef!: ElementRef;
  @ViewChild('trendChart') trendChartRef!: ElementRef;
  
  statusChart: any;
  trendChart: any;

  flags: FraudFlag[] = [];
  recentFlags: FraudFlag[] = [];
  
  // Stats
  totalFlags = 0;
  openCount = 0;
  clearedCount = 0;
  investigatedCount = 0;
  confirmedCount = 0;
  
  highSeverityCount = 0;
  mediumSeverityCount = 0;
  lowSeverityCount = 0;

  loading = true;
  error = '';

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    // Charts will be initialized once data is loaded
  }

  loadData(): void {
    this.loading = true;
    
    // Fetch fraud flags
    this.http.get<FraudFlag[]>('http://localhost:8010/api/fraud').subscribe({
      next: (data) => {
        this.flags = data;
        this.calculateStats();
        this.loading = false;
        setTimeout(() => this.initCharts(), 100);
      },
      error: (err) => {
        console.error('Failed to load fraud flags', err);
        this.error = 'Failed to load data.';
        this.loading = false;
      }
    });
  }

  private calculateStats(): void {
    this.totalFlags = this.flags.length;
    this.highSeverityCount = 0;
    this.mediumSeverityCount = 0;
    this.lowSeverityCount = 0;
    this.openCount = 0;
    this.clearedCount = 0;
    this.investigatedCount = 0;
    this.confirmedCount = 0;

    this.flags.forEach(f => {
      if (f.severity === 'HIGH' || f.severity === 'High') this.highSeverityCount++;
      else if (f.severity === 'MEDIUM' || f.severity === 'Medium') this.mediumSeverityCount++;
      else this.lowSeverityCount++;

      if (f.status === 'OPEN') this.openCount++;
      else if (f.status === 'CLEARED') this.clearedCount++;
      else if (f.status === 'INVESTIGATED') this.investigatedCount++;
      else if (f.status === 'CONFIRMED_FRAUD' || f.status === 'CONFIRMED') this.confirmedCount++;
    });

    this.recentFlags = [...this.flags].sort((a, b) => {
      return (b.flagId || 0) - (a.flagId || 0);
    }).slice(0, 5); // Show latest 5
  }

  goToDetails(flagId: number): void {
    this.router.navigate(['/compliance/fraud-investigation', flagId]);
  }

  initCharts(): void {
    if (this.statusChart) this.statusChart.destroy();
    if (this.trendChart) this.trendChart.destroy();

    if (this.statusChartRef && this.statusChartRef.nativeElement) {
      this.statusChart = new Chart(this.statusChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Open', 'Investigated', 'Confirmed', 'Cleared'],
          datasets: [{
            data: [this.openCount, this.investigatedCount, this.confirmedCount, this.clearedCount],
            backgroundColor: ['#dc3545', '#ffc107', '#212529', '#198754'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                usePointStyle: true,
                boxWidth: 8
              }
            }
          }
        }
      });
    }

    if (this.trendChartRef && this.trendChartRef.nativeElement) {
      const now = new Date();
      const msInWeek = 7 * 24 * 60 * 60 * 1000;
      let detected = [0, 0, 0, 0, 0];
      let cleared = [0, 0, 0, 0, 0];

      this.flags.forEach(f => {
        let weeksAgo = 0;
        if (f.createdAt) {
          const diff = now.getTime() - new Date(f.createdAt).getTime();
          weeksAgo = Math.floor(diff / msInWeek);
        }
        
        if (weeksAgo >= 0 && weeksAgo <= 4) {
          // Map 4 weeks ago -> index 0, this week -> index 4
          const index = 4 - weeksAgo;
          detected[index]++;
          if (f.status === 'CLEARED') {
            cleared[index]++;
          }
        }
      });

      this.trendChart = new Chart(this.trendChartRef.nativeElement, {
        type: 'line',
        data: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'This Week'],
          datasets: [{
            label: 'Flags Detected',
            data: detected,
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13, 110, 253, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Flags Cleared',
            data: cleared,
            borderColor: '#198754',
            backgroundColor: 'rgba(25, 135, 84, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                usePointStyle: true,
                boxWidth: 8
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              },
              grid: {
                color: 'rgba(0,0,0,0.05)'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }
  }
}
