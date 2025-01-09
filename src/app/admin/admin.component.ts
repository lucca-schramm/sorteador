import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';

interface LuckyNumber {
  number: string;
  month: string;
}

interface User {
  id: number;
  name: string;
  luckyNumbers: LuckyNumber[];
  month: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  users: User[] = [];
  winner: any = null;
  winnerNumber: any = null;
  json: any[] = [];

  constructor(private http: HttpClient) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
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
  }
  downloadDatabaseBackup() {
    this.http.get<any[]>(`http://localhost:5000/users`).subscribe({
      next: (users) => {
        const data = JSON.stringify(users, null, 2);

        const blob = new Blob([data], { type: 'application/json' });

        saveAs(blob, 'backup-dados.json');
      },
      error: (error) => {
        console.error('Erro ao baixar o banco de dados:', error);
      }
    });
  }

  downloadDatabaseBackupAsExcel() {
    this.http.get<any[]>(`http://localhost:5000/users`).subscribe({
      next: (users) => {
        const ws = XLSX.utils.json_to_sheet(users);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Backup');

        XLSX.writeFile(wb, 'backup-dados.xlsx');
      },
      error: (error) => {
        console.error('Erro ao baixar o banco de dados como Excel:', error);
      }
    });
  }

  async addUsersToDb(users: User[]) {
    for (const user of users) {
      let { id, name, month: currentMonth } = user;

      try {
        const existingUsers = await this.http.get<User[]>(`http://localhost:5000/users`).toPromise();
        const existingUser = existingUsers?.find(u => u.id == id);

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

  async addLuckyNumberToUser(user: User, currentMonth: string) {
    try {
      let existingLuckyNumber = user.luckyNumbers.find((ln: LuckyNumber) => ln.month == currentMonth);

      if (!existingLuckyNumber) {
        let luckyNumber = await this.generateUniqueLuckyNumber();

        const existingLuckyNumbers = await this.http.get<User[]>(`http://localhost:5000/users`).toPromise();
        const existingNumbers = existingLuckyNumbers?.flatMap(u => u.luckyNumbers.map((ln: LuckyNumber) => ln.number));

        while (existingNumbers?.includes(luckyNumber)) {
          luckyNumber = await this.generateUniqueLuckyNumber();
        }

        const userIndex = this.users.findIndex((dbUser: User) => dbUser.id == user.id);
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

  async generateUniqueLuckyNumber(): Promise<string> {
    let luckyNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    try {
      const existingUsers = await this.http.get<User[]>(`http://localhost:5000/users`).toPromise();
      const existingLuckyNumbers = existingUsers?.flatMap(user => user.luckyNumbers.map((ln: LuckyNumber) => ln.number));

      while (existingLuckyNumbers?.includes(luckyNumber)) {
        luckyNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      }

      return luckyNumber;
    } catch (error) {
      throw new Error('Erro ao verificar números existentes no banco de dados.');
    }
  }

  assignLuckyNumbers() {
    this.http.get<User[]>(`http://localhost:5000/users`).subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Erro ao carregar usuários:', error);
      }
    });
  }

  lotteryNumbersInput: string = '';
  drawResults: { number: string, position: number, user: User | null }[] = [];

  async insertLotteryNumbers() {
    const lotteryNumbers = this.lotteryNumbersInput.split(',').map(num => num.trim()).filter(num => num !== '');
  
    if (lotteryNumbers.length !== 10) {
      alert('Por favor, insira exatamente 10 números sorteados!');
      return;
    }
  
    const drawnNumbers: { number: string, position: number, user: User | null }[] = [];
  
    lotteryNumbers.forEach((number, index) => {
      const luckyNumber = number.trim();
      const user = this.users.find(user => user.luckyNumbers.some(lucky => lucky.number == luckyNumber));
  
      drawnNumbers.push({
        number: luckyNumber,
        position: index + 1,
        user: user || null,
      });
    });
  
    this.drawResults = drawnNumbers;
    try {
      const response = await fetch(`http://localhost:5000/drawnNumbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          luckyNumbers: lotteryNumbers
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar os números sorteados no servidor.');
      }

      const updatedUser = await response.json();
      console.log(`Usuário ${updatedUser.name} atualizado com sucesso!`);
    } catch (error) {
      console.error('Erro ao atualizar o usuário no servidor:', error);
    }

  }

  ngOnInit(): void {
    this.assignLuckyNumbers();
  }
}
