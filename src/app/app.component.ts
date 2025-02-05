import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';  // Importe o Router

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']  // Corrigido para 'styleUrls'
})
export class AppComponent {
  title = 'sorteio-app';

  constructor(private router: Router) {}
  
  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToHome() {
    this.router.navigate(['/']);
  }
  /*logout(): void {
    localStorage.removeItem('user');
    this.router.navigate(['/']); 
  }*/
}
