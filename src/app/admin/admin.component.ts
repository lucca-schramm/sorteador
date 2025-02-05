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
  month?: string;
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
  lotteryNumbers: string[] = [];
  drawResults: { number: string, position: number, user: User | null }[] = [];
  drawnNumbersRecords: { luckynumbers: string[], ref_sorteio: string }[] = [];
  errorMessage: string = '';
  successMessage: string = '';

  constructor() {}

  /**
   * Busca todos os usuários com seus números da sorte em lotes,
   * contornando o limite de 1000 registros por consulta.
   */
  async fetchAllUsersWithNumbers() {
    try {
      let offset = 0;
      const limit = 1000;
      let allUsers: User[] = [];

      while (true) {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, luckyNumbers: luckyNumbers(number, month)')
          .range(offset, offset + limit - 1);

        if (error) throw error;
        allUsers.push(...data);
        if (data.length < limit) break;
        offset += limit;
      }
      this.users = allUsers;
      console.log('Todos os usuários carregados:', this.users);
      this.successMessage = 'Usuários carregados com sucesso!';
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      this.errorMessage = 'Erro ao carregar os usuários. Tente novamente mais tarde.';
    } finally {
      this.showMessages();
    }
  }

  /**
   * Adiciona usuários ao banco e atribui números da sorte.
   * Utiliza chunking para contornar o limite de 1000 linhas do Supabase
   * e realiza inserção em lote dos números da sorte, otimizando as operações.
   */
  async addUsersToDb(users: User[]) {
    try {
      const chunkSize = 1000;
      const userIds = users.map(u => u.id);
      const existingUserIds = new Set<number>();

      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        const { data: existingUsersChunk, error: fetchError } = await supabase
          .from('users')
          .select('id')
          .in('id', chunk);
        if (fetchError) throw fetchError;
        existingUsersChunk.forEach((u: any) => existingUserIds.add(u.id));
      }

      const newUsers = users
        .filter(u => !existingUserIds.has(u.id))
        .map(u => ({ id: u.id, name: u.name }));

      if (newUsers.length > 0) {
        const { error: insertError } = await supabase
          .from('users')
          .insert(newUsers);
        if (insertError) throw insertError;
        newUsers.forEach(u => console.log(`Usuário ${u.name} adicionado!`));
      }

      const usersByMonth = new Map<string, User[]>();
      for (const user of users) {
        const month = user.month || new Date().toISOString().slice(0, 7);
        if (!usersByMonth.has(month)) {
          usersByMonth.set(month, []);
        }
        usersByMonth.get(month)?.push(user);
      }

      for (const [month, usersGroup] of usersByMonth) {
        const userIdsGroup = usersGroup.map(u => u.id);
        const luckyUserIds = new Set<number>();
        for (let i = 0; i < userIdsGroup.length; i += chunkSize) {
          const chunk = userIdsGroup.slice(i, i + chunkSize);
          const { data: existingLuckyNumbers, error: checkError } = await supabase
            .from('luckyNumbers')
            .select('user_id, number')
            .in('user_id', chunk)
            .eq('month', month);
          if (checkError) throw checkError;
          existingLuckyNumbers.forEach((l: any) => luckyUserIds.add(l.user_id));
        }

        const { data: existingNumbersData, error: numbersError } = await supabase
          .from('luckyNumbers')
          .select('number')
          .eq('month', month);
        if (numbersError) throw numbersError;
        const existingNumbers = new Set(existingNumbersData.map((n: any) => n.number));

        const newLuckyRecords: { user_id: number, number: string, month: string }[] = [];
        const generatedNumbers = new Set<string>();

        for (const user of usersGroup) {
          if (luckyUserIds.has(user.id)) {
            console.log(`Usuário ${user.name} já possui um número da sorte para o mês ${month}.`);
            continue;
          }
          let uniqueLuckyNumber: string;
          do {
            uniqueLuckyNumber = this.random4DigitNumber();
          } while (existingNumbers.has(uniqueLuckyNumber) || generatedNumbers.has(uniqueLuckyNumber));

          generatedNumbers.add(uniqueLuckyNumber);
          newLuckyRecords.push({ user_id: user.id, number: uniqueLuckyNumber, month });
        }

        if (newLuckyRecords.length > 0) {
          const { error: insertLuckyError } = await supabase
            .from('luckyNumbers')
            .insert(newLuckyRecords);
          if (insertLuckyError) throw insertLuckyError;
          newLuckyRecords.forEach(record =>
            console.log(`Número ${record.number} atribuído ao usuário ${record.user_id} para o mês ${record.month}.`)
          );
        }
      }
      this.successMessage = 'Dados importados e números atribuídos com sucesso!';
    } catch (err) {
      console.error('Erro ao adicionar usuário ou atribuir número da sorte:', err);
      this.errorMessage = 'Erro ao importar os dados. Tente novamente mais tarde.';
    } finally {
      this.showMessages();
    }
  }

showMessages() {
    if (this.successMessage) {
      alert(this.successMessage);
      this.successMessage = '';
    }
    if (this.errorMessage) {
      alert(this.errorMessage);
      this.errorMessage = '';
    }
  }

  random4DigitNumber(): string {
    return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  }

  getDrawnNumbers(): { luckynumbers: string[], ref_sorteio: string }[] {
    return this.drawnNumbersRecords;
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
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (!jsonData.length) {
          alert('O arquivo Excel está vazio.');
          return;
        }
        const headers = jsonData[0].map((h: string) => h.toLowerCase());
        const users: User[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const user: any = {};
          for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            if (header === 'id') {
              user.id = row[j];
            } else if (header === 'name') {
              user.name = row[j];
            } else if (header.includes('month')) {
              user.month = row[j];
            }
          }
          users.push(user);
        }
        this.json = users;
        console.log('Dados extraídos do Excel:', this.json);
        alert('Dados importados com sucesso!');
      };
      reader.readAsArrayBuffer(file);
    }
  }

  /**
   * Insere os números sorteados no banco, adicionando também a referência do sorteio (mês).
   */
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
      const refSorteio = this.getCurrentMonthName();
      const { error } = await supabase
        .from('drawnNumbers')
        .insert([{ luckynumbers: lotteryNumbers, ref_sorteio: refSorteio }]);
  
      if (error) throw error;
  
      this.successMessage = 'Números sorteados salvos com sucesso!';
      this.lotteryNumbersInput = ''; // Limpar input após inserção
      this.fetchDrawnNumbers(); // Atualizar a lista de números sorteados
    } catch (error) {
      console.error('Erro ao salvar números sorteados:', error);
      this.errorMessage = 'Erro ao salvar os números sorteados. Tente novamente mais tarde.';
    } finally {
      this.showMessages();
    }
  }

  /**
   * Retorna o nome do mês corrente em português.
   */
  getCurrentMonthName(): string {
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return months[new Date().getMonth()];
  }

  async downloadJSON() {
    const jsonData = JSON.stringify(this.users, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    await saveAs(blob, 'usuarios_numeros.json');
    alert('Backup (JSON) exportado com sucesso!');
  }

  async downloadExcel() {
    const ws = XLSX.utils.json_to_sheet(
      this.users.flatMap(user =>
        user.luckyNumbers?.map(ln => ({
          ID: user.id,
          Nome: user.name,
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
    await saveAs(blob, 'usuarios_numeros.xlsx');
    alert('Backup (Excel) exportado com sucesso!');
  }

  refreshPage(): void {
    window.location.reload();
  }

  refreshData(): void {
    this.fetchAllUsersWithNumbers();
    this.fetchDrawnNumbers();
  }

  /**
   * Busca os registros de números sorteados, exibindo os números e o mês em que foram sorteados.
   */
  async fetchDrawnNumbers() {
    try {
      const { data, error } = await supabase
        .from('drawnNumbers')
        .select('luckynumbers, ref_sorteio');
        if (error) throw error;
        this.drawnNumbersRecords = [...(data || [])];
      console.log('Números sorteados carregados:', this.drawnNumbersRecords);
    } catch (error) {
      await console.error('Erro ao buscar números sorteados:', error);
      alert('Erro ao carregar os números sorteados.');
    }
  }

  ngOnInit(): void {
    this.fetchAllUsersWithNumbers();
    this.fetchDrawnNumbers();
  }

  /**
   * Atribui números da sorte para um determinado mês,
   * utilizando chunking e inserção em lote para otimizar a operação.
   */
  async assignLuckyNumbersForMonth(month: string) {
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name');
      if (usersError) throw usersError;

      const chunkSize = 1000;
      const userIds = users.map(u => u.id);
      const luckyUserIds = new Set<number>();

      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        const { data: existingLuckyNumbers, error: checkError } = await supabase
          .from('luckyNumbers')
          .select('user_id, number')
          .in('user_id', chunk)
          .eq('month', month);
        if (checkError) throw checkError;
        existingLuckyNumbers.forEach((l: any) => luckyUserIds.add(l.user_id));
      }

      const { data: existingNumbersData, error: numbersError } = await supabase
        .from('luckyNumbers')
        .select('number')
        .eq('month', month);
      if (numbersError) throw numbersError;
      const existingNumbers = new Set(existingNumbersData.map((n: any) => n.number));

      const newLuckyRecords: { user_id: number, number: string, month: string }[] = [];
      const generatedNumbers = new Set<string>();

      for (const user of users) {
        if (luckyUserIds.has(user.id)) {
          console.log(`Usuário ${user.name} já possui um número da sorte para o mês ${month}.`);
          continue;
        }
        let uniqueLuckyNumber: string;
        do {
          uniqueLuckyNumber = this.random4DigitNumber();
        } while (existingNumbers.has(uniqueLuckyNumber) || generatedNumbers.has(uniqueLuckyNumber));
        generatedNumbers.add(uniqueLuckyNumber);
        newLuckyRecords.push({ user_id: user.id, number: uniqueLuckyNumber, month });
      }

      if (newLuckyRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('luckyNumbers')
          .insert(newLuckyRecords);
        if (insertError) throw insertError;
        newLuckyRecords.forEach(record =>
          console.log(`Número ${record.number} atribuído ao usuário ${record.user_id} para o mês ${record.month}.`)
        );
      }
      this.successMessage = 'Números da sorte atribuídos com sucesso!';
    } catch (error) {
      console.error('Erro ao atribuir números da sorte:', error);
      this.errorMessage = 'Erro ao atribuir os números da sorte. Tente novamente mais tarde.';
    } finally {
      this.showMessages()
    }
  }
}
