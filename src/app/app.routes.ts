import { Routes } from '@angular/router';
import { HomeComponent } from './components/home';
import { CategoryComponent } from './components/category';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'category/:name', component: CategoryComponent },
  { path: '**', redirectTo: '' }
];