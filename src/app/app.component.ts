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

  // Injetando o Router para realizar navegação
  constructor(private router: Router) {}

  logout(): void {
    localStorage.removeItem('user');  // Remove o usuário do localStorage
    this.router.navigate(['/']);  // Redireciona para a página inicial
  }
}
