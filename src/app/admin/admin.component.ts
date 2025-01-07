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

  addUsersToDb(users: any[]) {
    users.forEach(user => {
      const id = user.id;
      const name = user.nome;
      const currentMonth = user.mes;

      this.http.get<any[]>(`http://localhost:5000/users`).subscribe(existingUsers => {
        const existingUser = existingUsers.find(u => u.id === id);

        if (existingUser) {
          this.addLuckyNumberToUser(existingUser, currentMonth);
        } else {
          this.generateUniqueLuckyNumber().then(uniqueLuckyNumber => {
            this.http.post(`http://localhost:5000/users`, { 
              id, 
              name, 
              luckyNumbers: [{ number: uniqueLuckyNumber, month: currentMonth }],
            }).subscribe({
              next: () => console.log(`Usuário ${name} adicionado com sucesso!`),
              error: (err) => console.error('Erro ao adicionar o usuário:', err)
            });
          });
        }
      });
    });
  }

  // Função para adicionar número da sorte ao usuário existente
  addLuckyNumberToUser(user: any, currentMonth: string) {
    const luckyNumber = Math.floor(Math.random() * 9999) + 1; // Gera um número da sorte

    // Verifica se o número já existe para o mês atual
    const existingLuckyNumber = user.luckyNumbers?.find((ln: any) => ln.month === currentMonth);

    if (!existingLuckyNumber) {
      // Se não houver número para o mês, adiciona o número ao array
      user.luckyNumbers.push({ number: luckyNumber, month: currentMonth });

      this.http.put(`http://localhost:5000/users/${user.id}`, user).subscribe({
        next: () => console.log(`Número da sorte adicionado para o usuário ${user.name}`),
        error: (err) => console.error('Erro ao atualizar número da sorte do usuário:', err)
      });
    } else {
      console.log(`Usuário ${user.name} já tem um número da sorte para o mês ${currentMonth}`);
    }
  }

  generateUniqueLuckyNumber(): Promise<number> {
    return new Promise((resolve, reject) => {
      let luckyNumber = Math.floor(Math.random() * 9999) + 1;

      this.http.get<any[]>(`http://localhost:5000/users`).subscribe(existingUsers => {
        const existingLuckyNumbers = existingUsers.flatMap(user => user.luckyNumbers.map((ln: any) => ln.number));
        
        while (existingLuckyNumbers.includes(luckyNumber)) {
          luckyNumber = Math.floor(Math.random() * 9999) + 1;
        }
        
        resolve(luckyNumber);
      }, error => {
        reject('Erro ao verificar números existentes no banco de dados.');
      });
    });
  }

  // Função para carregar usuários para a lista
  assignLuckyNumbers() {
    this.http.get<any[]>(`http://localhost:5000/users`).subscribe(users => {
      this.users = users;
    }, error => {
      console.error('Erro ao carregar usuários:', error);
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
