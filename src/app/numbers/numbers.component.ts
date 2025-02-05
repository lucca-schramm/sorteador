import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { supabase } from '../services/supabase.service';

interface LuckyNumber {
  number: string;
  month: string;
  isDrawn?: boolean;
}

interface User {
  id: number;
  name: string;
  luckyNumbers?: LuckyNumber[];
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
  drawnNumbers: string[] = [];

  constructor() {}

  async getUserNumbers() {
    // Limpa mensagens e dados anteriores.
    this.errorMessage = '';
    this.successMessage = '';
    this.userNumbers = [];
    this.drawnNumbers = [];

    if (!this.id.trim()) {
      this.errorMessage = 'Por favor, digite um ID válido.';
      return;
    }

    try {
      const userId = Number(this.id);

      // Busca o usuário com o ID informado.
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        throw userError;
      }

      if (!user) {
        this.errorMessage = 'Usuário não encontrado.';
        return;
      }

      // Busca os números da sorte do usuário.
      const { data: luckyNumbersData, error: luckyError } = await supabase
        .from('luckyNumbers')
        .select('*')
        .eq('user_id', userId);

      if (luckyError) {
        throw luckyError;
      }

      const userLuckyNumbers: LuckyNumber[] = luckyNumbersData || [];

      // Busca os números sorteados, selecionando a coluna 'luckynumbers'
      const { data: drawnData, error: drawnError } = await supabase
        .from('drawnNumbers')
        .select('luckynumbers');

      if (drawnError) {
        throw drawnError;
      }

      // Mapeia os números sorteados utilizando a chave correta 'luckynumbers'
      this.drawnNumbers = (drawnData || []).flatMap((row: any) => row.luckynumbers || []);

      // Mapeia os números do usuário definindo a flag 'isDrawn' se o número estiver entre os sorteados.
      this.userNumbers = userLuckyNumbers.map(lucky => ({
        ...lucky,
        isDrawn: this.drawnNumbers.includes(lucky.number)
      }));

      this.successMessage = 'Seus números foram carregados!';
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      this.errorMessage = 'Erro ao buscar os números. Tente novamente mais tarde.';
    }
  }
}
