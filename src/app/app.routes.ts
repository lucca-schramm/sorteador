import { Routes } from '@angular/router';
import { AdminComponent } from './admin/admin.component';
import { HomeComponent } from './home/home.component';
import { NumbersComponent } from './numbers/numbers.component';

export const appRoutes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'numbers', component: NumbersComponent },
  { path: '**', redirectTo: '' }
];
