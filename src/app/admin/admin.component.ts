import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { supabase } from '../services/supabase.service';

interface LuckyNumber {
  number: string;
  month: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  luckyNumbers?: LuckyNumber[];
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
  json: any[] = [];
  lotteryNumbersInput: string = '';
  drawResults: { number: string, position: number, user: User | null }[] = [];

  constructor() {}

  async addUsersToDb(users: any[]) {
    for (const user of users) {
      try {
        // Verifica se o usuário já existe
        const { data: existingUsers, error: fetchError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id);

        if (fetchError) throw fetchError;

        if (!existingUsers.length) {
          const { error: insertError } = await supabase
            .from('users')
            .insert([{ id: user.id, name: user.name, email: '' }]);
          if (insertError) throw insertError;
          console.log(`Usuário ${user.name} adicionado!`);
        }

        // Usa o mês do arquivo ou o mês atual
        const month = user.referenceMonth || new Date().toISOString().slice(0, 7);
        const uniqueLuckyNumber = await this.generateUniqueLuckyNumber();

        const { error: insertLuckyError } = await supabase
          .from('luckyNumbers')
          .insert([{ user_id: user.id, number: uniqueLuckyNumber, month }]);
        if (insertLuckyError) throw insertLuckyError;
        console.log(`Número ${uniqueLuckyNumber} atribuído ao usuário ${user.name} para o mês ${month}.`);
      } catch (err) {
        console.error('Erro ao adicionar usuário ou atribuir número da sorte:', err);
      }
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        // Converte a planilha para um array onde a primeira linha é o cabeçalho
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (!jsonData.length) {
          alert('O arquivo Excel está vazio.');
          return;
        }
        const headers = jsonData[0].map((h: string) => h.toLowerCase());
        const users = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const user: any = {};
          for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            if (header === 'id') {
              user.id = row[j];
            } else if (header === 'nome') {
              user.name = row[j];
            } else if (header.includes('mês')) {
              user.referenceMonth = row[j];
            }
          }
          users.push(user);
        }
        this.json = users;
        console.log('Dados extraídos do Excel:', this.json);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  async generateUniqueLuckyNumber(): Promise<string> {
    let luckyNumber: string = '';
    let exists = true;

    while (exists) {
      luckyNumber = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');

      const { data: existingNumber, error } = await supabase
        .from('luckyNumbers')
        .select('number')
        .eq('number', luckyNumber)
        .limit(1);

      if (error) throw error;

      exists = existingNumber.length > 0;
    }

    return luckyNumber;
  }

  async insertLotteryNumbers() {
    const lotteryNumbers = this.lotteryNumbersInput
      .split(',')
      .map(num => num.trim())
      .filter(num => num !== '');

    if (lotteryNumbers.length !== 10) {
      alert('Por favor, insira exatamente 10 números sorteados!');
      return;
    }

    try {
      const { error } = await supabase
        .from('drawnNumbers')
        .insert([{ luckyNumbers: lotteryNumbers }]);

      if (error) throw error;
      console.log('Números sorteados salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar números sorteados:', error);
    }
  }

  async fetchUsersWithNumbers() {
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, luckyNumbers: luckyNumbers(number, month)');
  
      if (usersError) throw usersError;
  
      this.users = users;
      console.log('Usuários e números carregados:', this.users);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  }

  downloadJSON() {
    const jsonData = JSON.stringify(this.users, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    saveAs(blob, 'usuarios_numeros.json');
  }

  downloadExcel() {
    const ws = XLSX.utils.json_to_sheet(
      this.users.flatMap(user =>
        user.luckyNumbers?.map(ln => ({
          ID: user.id,
          Nome: user.name,
          Email: user.email,
          NúmeroDaSorte: ln.number,
          Mês: ln.month
        })) || []
      )
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuários e Números');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob(
      [excelBuffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
    saveAs(blob, 'usuarios_numeros.xlsx');
  }

  ngOnInit(): void {
    // Caso não se utilize o upload do Excel para inserir usuários,
    // é possível chamar uma função para atribuir números da sorte para o mês atual.
    const month = new Date().toISOString().slice(0, 7);
    this.assignLuckyNumbersForMonth(month);
    this.fetchUsersWithNumbers();
  }

  async assignLuckyNumbersForMonth(month: string) {
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name');

      if (usersError) throw usersError;

      for (const user of users) {
        const uniqueLuckyNumber = await this.generateUniqueLuckyNumber();

        const { error: insertError } = await supabase
          .from('luckyNumbers')
          .insert([{ user_id: user.id, number: uniqueLuckyNumber, month }]);

        if (insertError) throw insertError;
        console.log(`Número ${uniqueLuckyNumber} atribuído ao usuário ${user.name}.`);
      }
    } catch (error) {
      console.error('Erro ao atribuir números da sorte:', error);
    }
  }
}
