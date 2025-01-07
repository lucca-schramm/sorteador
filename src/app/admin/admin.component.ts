import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { CommonModule } from '@angular/common';

interface LuckyNumber {
  number: number;
  month: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  users: any[] = [];
  winner: any = null;
  winnerNumber: any = null;
  json = [];

  constructor(private http: HttpClient) {}

  // Lê o arquivo Excel e converte para JSON
  onFileSelected(event: any) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      this.json = XLSX.utils.sheet_to_json(sheet);
    };
    reader.readAsBinaryString(file);
  }

  // Adiciona os usuários ao banco de dados
  async addUsersToDb(users: any[]) {
    for (const user of users) {
      let id = user.id;
      let name = user.name;
      let currentMonth = user.month;
      try {
        const existingUsers = await this.http.get<any[]>(`http://localhost:5000/users`).toPromise();
        const existingUser = existingUsers?.find(u => u.id == Number(id));

        if (existingUser) {
          await this.addLuckyNumberToUser(existingUser, currentMonth);
        } else {
          const uniqueLuckyNumber = await this.generateUniqueLuckyNumber();
          await this.http.post(`http://localhost:5000/users`, {
            id,
            name,
            luckyNumbers: [{ number: uniqueLuckyNumber, month: currentMonth }]
          }).toPromise();
          console.log(`Usuário ${name} adicionado com sucesso!`);
        }
      } catch (err) {
        console.error('Erro ao adicionar o usuário:', err);
      }
    }
  }

  async addLuckyNumberToUser(user: any, currentMonth: string) {
    try {
      let existingLuckyNumber = user.luckyNumbers?.find((ln: any) => ln.month === currentMonth);
      
      if (!existingLuckyNumber) {
        let luckyNumber = await this.generateUniqueLuckyNumber();

        const existingLuckyNumbers = await this.http.get<any[]>(`http://localhost:5000/users`).toPromise();
        const existingNumbers = existingLuckyNumbers?.flatMap(user => user.luckyNumbers.map((ln: any) => ln.number));

        while (existingNumbers?.includes(luckyNumber)) {
          luckyNumber = Math.floor(Math.random() * 9999) + 1;
        }

        const userIndex = this.users.findIndex((dbUser: any) => dbUser.id == user.id);
        if (userIndex !== -1) {
          this.users[userIndex].luckyNumbers.push({ number: luckyNumber, month: currentMonth });

          const response = await fetch(`http://localhost:5000/users/${user.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              luckyNumbers: this.users[userIndex].luckyNumbers
            })
          });

          if (!response.ok) {
            throw new Error('Falha ao atualizar o usuário no servidor');
          }

          const data = await response.json();
          console.log('Resposta do servidor:', data);
        } else {
          console.error(`Usuário com ID ${user.id} não encontrado no banco de dados.`);
        }
      } else {
        console.log(`Usuário ${user.name} já tem um número da sorte para o mês ${currentMonth}`);
      }
    } catch (error) {
      console.error('Erro ao gerar número da sorte ou atualizar o usuário:', error);
    }
  }

  // Gera um número da sorte único
  async generateUniqueLuckyNumber(): Promise<number> {
    let luckyNumber = Math.floor(Math.random() * 9999) + 1;

    try {
      const existingUsers = await this.http.get<any[]>(`http://localhost:5000/users`).toPromise();
      const existingLuckyNumbers = existingUsers?.flatMap(user => user.luckyNumbers.map((ln: any) => ln.number));

      // Garante que o número seja único
      while (existingLuckyNumbers?.includes(luckyNumber)) {
        luckyNumber = Math.floor(Math.random() * 9999) + 1;
      }

      return luckyNumber;
    } catch (error) {
      throw new Error('Erro ao verificar números existentes no banco de dados.');
    }
  }

  // Carrega os usuários do banco de dados
  assignLuckyNumbers() {
    this.http.get<any[]>(`http://localhost:5000/users`).subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Erro ao carregar usuários:', error);
      }
    });
  }

  drawLottery() {
    const allLuckyNumbers = this.users.flatMap(user =>
      user.luckyNumbers.map((lucky: LuckyNumber) => ({ number: lucky.number, user: user }))
    );

    if (allLuckyNumbers.length === 0) {
      console.log('Não há números da sorte para sortear.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * allLuckyNumbers.length);
    const selectedLuckyNumber = allLuckyNumbers[randomIndex];

    this.winner = selectedLuckyNumber.user;
    this.winnerNumber = selectedLuckyNumber.number;

    console.log(`Vencedor: ${this.winner.name}, Número da Sorte: ${this.winnerNumber}`);
  }

  ngOnInit(): void {
    this.assignLuckyNumbers();
  }
}
