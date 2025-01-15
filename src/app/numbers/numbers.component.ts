import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface LuckyNumber {
  number: number;
  month: string;
  isDrawn?: boolean;
}

interface User {
  id: number;
  name: string;
  luckyNumbers: LuckyNumber[];
}

interface DrawnNumber {
  number: number;
  luckyNumbers: number[];
}

@Component({
  selector: 'app-numbers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './numbers.component.html',
  styleUrls: ['./numbers.component.css']
})

export class NumbersComponent {
  id: string = '';
  userNumbers: LuckyNumber[] = [];
  errorMessage: string = '';
  successMessage: string = '';
  drawnNumbers: number[] = [];

  constructor(private http: HttpClient) {}

  getUserNumbers() {
    this.errorMessage = '';
    this.successMessage = '';
  
    if (!this.id.trim()) {
      this.errorMessage = 'Por favor, digite um ID válido.';
      return;
    }
  
    this.http.get<User[]>(`http://192.168.169.130:5000/users`).subscribe({
      next: (users) => {
        const user = users.find(u => u.id == Number(this.id));
  
        if (user && user.luckyNumbers && user.luckyNumbers.length > 0) {
          this.http.get<DrawnNumber[]>(`http://192.168.169.130:5000/drawnNumbers`).subscribe({
            next: (drawnNumbers) => {
              this.drawnNumbers = drawnNumbers.flatMap(d => d.luckyNumbers);
              this.userNumbers = user.luckyNumbers.map(lucky => ({
                ...lucky,
                isDrawn: this.drawnNumbers.includes(lucky.number)
              }));
            },
            error: (error) => {
              console.error('Erro ao buscar números sorteados:', error);
              this.errorMessage = 'Erro ao verificar números sorteados. Tente novamente mais tarde.';
            }
          });
        } else {
          this.userNumbers = [];
          this.errorMessage = 'Você ainda não tem números da sorte registrados.';
        }
      },
      error: (error) => {
        console.error('Erro ao buscar números do usuário:', error);
        this.userNumbers = [];
        this.errorMessage = 'Ocorreu um erro ao buscar os números. Tente novamente mais tarde.';
      }
    });
  }
}
