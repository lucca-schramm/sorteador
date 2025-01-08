import { Routes } from '@angular/router';
import { AdminComponent } from './admin/admin.component';
import { HomeComponent } from './home/home.component';
import { NumbersComponent } from './numbers/numbers.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './auth.guard';

export const appRoutes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'numbers', component: NumbersComponent },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];
