import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
    if (this.username === 'admin' && this.password === 'admin123') {
      localStorage.setItem('user', 'admin');
      this.router.navigate(['/admin']);
    } else {
      alert('Credenciais inválidas!');
    }
  }
}
