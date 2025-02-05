import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ CommonModule, FormsModule ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';

  constructor(private router: Router) {}

  onLogin(): void {
    if (this.username === environment.login && this.password === environment.senha) {
      localStorage.setItem('user', 'admin');
      this.router.navigate(['/admin']);
    } else {
      alert('Credenciais inválidas!');
    }
  }
}
