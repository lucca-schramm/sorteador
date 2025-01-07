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
  id: string = '';  // ID do usuário
  userNumbers: { number: number; month: string }[] = [];  // Números da sorte do usuário
  errorMessage: string = '';  // Mensagens de erro
  successMessage: string = ''; // Mensagem de sucesso

  constructor(private http: HttpClient) {}

  // Função para buscar os números da sorte do usuário
  getUserNumbers() {
    this.errorMessage = ''; // Limpa a mensagem de erro anterior
    this.successMessage = ''; // Limpa a mensagem de sucesso

    if (!this.id.trim()) {
      this.errorMessage = 'Por favor, digite um ID válido.';
      return;
    }

    this.http.get<any[]>(`http://localhost:5000/users`).subscribe(
      users => {
        const user = users.find(u => u.id === Number(this.id));
        if (user && user.luckyNumbers && user.luckyNumbers.length > 0) {
          this.userNumbers = user.luckyNumbers;
        } else {
          this.userNumbers = [];
          this.errorMessage = 'Você ainda não tem números da sorte registrados.';
        }
      },
      (error) => {
        console.error('Erro ao buscar números do usuário:', error);
        this.userNumbers = [];
        this.errorMessage = 'Ocorreu um erro ao buscar os números. Tente novamente mais tarde.';
      }
    );
  }

  // Função para atualizar os números da sorte do usuário
  updateUserLuckyNumber() {
    this.successMessage = '';  // Limpa a mensagem de sucesso

    if (!this.id.trim()) {
      this.errorMessage = 'Por favor, forneça um ID de usuário válido.';
      return;
    }

    this.http.get<any[]>(`http://localhost:5000/users`).subscribe(users => {
      const user = users.find(u => u.id === Number(this.id));
      if (user) {
        // Caso o usuário exista, atualiza os números
        user.luckyNumbers = this.userNumbers;  // Atualiza o array de números da sorte

        // Faz a requisição PUT para atualizar os números da sorte do usuário
        this.http.put(`http://localhost:5000/users/${user.id}`, user).subscribe({
          next: () => {
            this.successMessage = 'Os números da sorte foram atualizados com sucesso!';
            this.errorMessage = '';
          },
          error: (err) => {
            console.error('Erro ao atualizar números da sorte:', err);
            this.errorMessage = 'Ocorreu um erro ao atualizar os números. Tente novamente mais tarde.';
          }
        });
      } else {
        this.errorMessage = 'Usuário não encontrado.';
      }
    });
  }
}
