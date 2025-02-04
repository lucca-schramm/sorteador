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
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.id.trim()) {
      this.errorMessage = 'Por favor, digite um ID válido.';
      return;
    }

    try {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', Number(this.id));

      if (userError) throw userError;

      const user = users?.[0] as User;

      if (user) {
        const { data: luckyNumbers, error: luckyError } = await supabase
          .from('luckyNumbers')
          .select('*')
          .eq('user_id', user.id);

        if (luckyError) throw luckyError;

        user.luckyNumbers = luckyNumbers;

        const { data: drawnNumbers, error: drawnError } = await supabase
          .from('drawnNumbers')
          .select('*');

        if (drawnError) throw drawnError;

        this.drawnNumbers = drawnNumbers.flatMap(d => d.luckyNumbers);

        this.userNumbers = user.luckyNumbers.map(lucky => ({
          ...lucky,
          isDrawn: this.drawnNumbers.includes(lucky.number)
        }));

        this.successMessage = 'Seus números foram carregados!';
      } else {
        this.userNumbers = [];
        this.errorMessage = 'Você ainda não tem números da sorte registrados.';
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      this.errorMessage = 'Erro ao buscar os números. Tente novamente mais tarde.';
    }
  }
}
