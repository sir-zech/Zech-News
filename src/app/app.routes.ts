import { Routes } from '@angular/router';
import { HomeComponent } from './components/home';
import { CategoryComponent } from './components/category';
import { ArticleDetailComponent } from './components/article-detail';
import { BookmarksComponent } from './components/bookmarks';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'category/:name', component: CategoryComponent },
  { path: 'article', component: ArticleDetailComponent },
  { path: 'bookmarks', component: BookmarksComponent },
  { path: '**', redirectTo: '' }
];
