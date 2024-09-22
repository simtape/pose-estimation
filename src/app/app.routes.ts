import { Routes } from '@angular/router';
import {NotFoundComponent} from "./components/not-found/not-found.component";

export const routes: Routes = [
  {path: '',
    redirectTo: 'video-capture',
    pathMatch: 'full'},
  {
    path: 'video-capture',
    loadComponent: () => import('./pages/video-capture/video-capture.component').then(m => m.VideoCaptureComponent),
  },
  {
    path:'**',
    component: NotFoundComponent
  }
];
