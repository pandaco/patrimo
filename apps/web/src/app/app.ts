import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  template: '<router-outlet />',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'web';
}
