import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-numbers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './numbers.component.html',
  styleUrls: ['./numbers.component.css']
})
export class NumbersComponent {
  userId: string = '';
  userNumbers: { number: number; month: string }[] = []; // Array de números e meses

  constructor(private http: HttpClient) {}

  // Função para buscar os números da sorte do usuário
  getUserNumbers() {
    this.http.get<any[]>(`http://localhost:5000/users`).subscribe(users => {
      const user = users.find(u => u.id === this.userId);
      if (user && user.luckyNumbers) {
        // Se o usuário for encontrado, armazena os números e meses
        this.userNumbers = user.luckyNumbers;
      } else {
        // Se o usuário não tiver números da sorte, limpa a variável
        this.userNumbers = [];
      }
    }, (error) => {
      console.error('Erro ao buscar números do usuário:', error);
      this.userNumbers = [];
    });
  }
}
